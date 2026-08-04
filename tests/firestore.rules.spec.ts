import { readFileSync } from 'node:fs'

import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { Timestamp, collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

const projectId = process.env.GCLOUD_PROJECT ?? 'demo-vue-firebase-starter'
const emulatorUrl = new URL(`http://${process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'}`)

let testEnvironment: RulesTestEnvironment

describe('Firestore full-mode rules', () => {
  beforeAll(async () => {
    testEnvironment = await initializeTestEnvironment({
      projectId,
      firestore: {
        host: emulatorUrl.hostname,
        port: Number(emulatorUrl.port),
        rules: readFileSync('firestore.rules.full', 'utf8'),
      },
    })
  })

  beforeEach(async () => testEnvironment.clearFirestore())
  afterAll(async () => testEnvironment?.cleanup())

  it('default-denies unauthenticated and collection access', async () => {
    const unauthenticated = testEnvironment.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(unauthenticated, 'users/alice')))
    await assertFails(setDoc(doc(unauthenticated, 'users/alice'), validProfile()))
    await assertFails(getDocs(collection(aliceFirestore(), 'users')))
  })

  it('allows an owner to create and read the exact model', async () => {
    const reference = doc(aliceFirestore(), 'users/alice')
    await assertSucceeds(setDoc(reference, validProfile()))
    await assertSucceeds(getDoc(reference))
  })

  it('denies cross-user access', async () => {
    await setDoc(doc(aliceFirestore(), 'users/alice'), validProfile())
    const reference = doc(bobFirestore(), 'users/alice')
    await assertFails(getDoc(reference))
    await assertFails(updateDoc(reference, { status: 'deactivated', updatedAt: serverTimestamp() }))
  })

  it('rejects identity duplication, privileges, unknown fields, and missing fields', async () => {
    const reference = doc(aliceFirestore(), 'users/alice')
    for (const extra of [{ email: 'alice@example.com' }, { displayName: 'Alice' }, { photoURL: 'https://example.com/alice.jpg' }, { role: 'admin' }, { payload: 'x'.repeat(1_000_000) }]) {
      await assertFails(setDoc(reference, { ...validProfile(), ...extra }))
    }
    await assertFails(setDoc(reference, { status: 'active', createdAt: serverTimestamp() }))
  })

  it('validates initial state, field types, and server timestamps', async () => {
    const reference = doc(aliceFirestore(), 'users/alice')
    await assertFails(setDoc(reference, { ...validProfile(), status: 'deactivated' }))
    await assertFails(setDoc(reference, { ...validProfile(), status: 'unknown' }))
    await assertFails(setDoc(reference, { ...validProfile(), status: 42 }))
    await assertFails(setDoc(reference, { ...validProfile(), createdAt: Timestamp.fromMillis(0) }))
    await assertFails(setDoc(reference, { ...validProfile(), updatedAt: Timestamp.fromMillis(0) }))
  })

  it('allows only active/deactivated owner transitions', async () => {
    const reference = doc(aliceFirestore(), 'users/alice')
    await setDoc(reference, validProfile())

    await assertSucceeds(updateDoc(reference, { status: 'deactivated', updatedAt: serverTimestamp() }))
    await assertSucceeds(getDoc(reference))
    await assertSucceeds(updateDoc(reference, { status: 'active', updatedAt: serverTimestamp() }))

    await assertFails(updateDoc(reference, { status: 'suspended', updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(reference, { status: 'active', updatedAt: serverTimestamp() }))
  })

  it('rejects update bypasses, timestamp manipulation, and schema pollution', async () => {
    const reference = doc(aliceFirestore(), 'users/alice')
    await setDoc(reference, validProfile())

    await assertFails(updateDoc(reference, { role: 'admin', updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(reference, { displayName: 'Injected', updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(reference, { status: 'deactivated', createdAt: serverTimestamp(), updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(reference, { status: 'deactivated', updatedAt: Timestamp.fromMillis(0) }))
    await assertFails(setDoc(reference, { status: 'deactivated', updatedAt: serverTimestamp() }))
  })

  it('keeps suspended documents client-read-only', async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users/alice'), { ...validProfile(), status: 'suspended' })
    })
    const reference = doc(aliceFirestore(), 'users/alice')
    await assertSucceeds(getDoc(reference))
    await assertFails(updateDoc(reference, { status: 'active', updatedAt: serverTimestamp() }))
  })

  it('denies deletion, subcollections, and unmatched collections', async () => {
    const reference = doc(aliceFirestore(), 'users/alice')
    await setDoc(reference, validProfile())
    await assertFails(deleteDoc(reference))
    await assertFails(setDoc(doc(aliceFirestore(), 'users/alice/private/secret'), { value: true }))
    await assertFails(setDoc(doc(aliceFirestore(), 'business/example'), { value: true }))
  })
})

function aliceFirestore() {
  return testEnvironment.authenticatedContext('alice').firestore()
}

function bobFirestore() {
  return testEnvironment.authenticatedContext('bob').firestore()
}

function validProfile() {
  return {
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
}
