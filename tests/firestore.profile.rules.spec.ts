import { readFileSync } from 'node:fs'

import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { Timestamp, collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

const emulatorUrl = new URL(`http://${process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'}`)
let testEnvironment: RulesTestEnvironment

describe('Firestore profile-mode rules', () => {
  beforeAll(async () => {
    testEnvironment = await initializeTestEnvironment({
      projectId: 'demo-vue-firebase-starter-profile',
      firestore: {
        host: emulatorUrl.hostname,
        port: Number(emulatorUrl.port),
        rules: readFileSync('firestore.rules.profile', 'utf8'),
      },
    })
  })

  beforeEach(async () => testEnvironment.clearFirestore())
  afterAll(async () => testEnvironment?.cleanup())

  it('allows only an owner to create and read exact metadata', async () => {
    const reference = doc(aliceFirestore(), 'users/alice')
    await assertSucceeds(setDoc(reference, validMetadata()))
    await assertSucceeds(getDoc(reference))
    await assertFails(getDoc(doc(bobFirestore(), 'users/alice')))
    await assertFails(getDocs(collection(aliceFirestore(), 'users')))
  })

  it('denies unauthenticated and cross-user writes', async () => {
    await assertFails(setDoc(doc(testEnvironment.unauthenticatedContext().firestore(), 'users/alice'), validMetadata()))
    await assertFails(setDoc(doc(bobFirestore(), 'users/alice'), validMetadata()))
  })

  it('rejects identity, status, privilege, and arbitrary fields', async () => {
    const reference = doc(aliceFirestore(), 'users/alice')
    for (const extra of [{ email: 'alice@example.com' }, { displayName: 'Alice' }, { photoURL: 'https://example.com/alice.jpg' }, { status: 'active' }, { role: 'admin' }, { payload: 'x'.repeat(1_000_000) }]) {
      await assertFails(setDoc(reference, { ...validMetadata(), ...extra }))
    }
  })

  it('requires both server timestamps with valid types', async () => {
    const reference = doc(aliceFirestore(), 'users/alice')
    await assertFails(setDoc(reference, { createdAt: serverTimestamp() }))
    await assertFails(setDoc(reference, { ...validMetadata(), createdAt: Timestamp.fromMillis(0) }))
    await assertFails(setDoc(reference, { ...validMetadata(), updatedAt: 'now' }))
  })

  it('denies all updates, deletion, subcollections, and unmatched paths', async () => {
    const reference = doc(aliceFirestore(), 'users/alice')
    await setDoc(reference, validMetadata())
    await assertFails(updateDoc(reference, { updatedAt: serverTimestamp() }))
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

function validMetadata() {
  return { createdAt: serverTimestamp(), updatedAt: serverTimestamp() }
}
