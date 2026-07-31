import { readFileSync } from 'node:fs'

import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { Timestamp, collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

const projectId = process.env.GCLOUD_PROJECT ?? 'demo-vue-firebase-starter'
const emulatorUrl = new URL(`http://${process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'}`)

let testEnvironment: RulesTestEnvironment

describe('Firestore user profile rules', () => {
  beforeAll(async () => {
    testEnvironment = await initializeTestEnvironment({
      projectId,
      firestore: {
        host: emulatorUrl.hostname,
        port: Number(emulatorUrl.port),
        rules: readFileSync('firestore.rules', 'utf8'),
      },
    })
  })

  beforeEach(async () => {
    await testEnvironment.clearFirestore()
  })

  afterAll(async () => {
    await testEnvironment?.cleanup()
  })

  it('denies unauthenticated profile access', async () => {
    const firestore = testEnvironment.unauthenticatedContext().firestore()

    await assertFails(getDoc(doc(firestore, 'users/alice')))
    await assertFails(getDocs(collection(firestore, 'users')))
    await assertFails(setDoc(doc(firestore, 'users/alice'), validProfile()))
  })

  it('allows an owner to create and read a valid profile', async () => {
    const firestore = aliceFirestore()
    const reference = doc(firestore, 'users/alice')

    await assertSucceeds(setDoc(reference, validProfile()))
    await assertSucceeds(getDoc(reference))
  })

  it('denies cross-user reads and writes', async () => {
    const aliceReference = doc(aliceFirestore(), 'users/alice')
    await setDoc(aliceReference, validProfile())

    const bobReference = doc(bobFirestore(), 'users/alice')

    await assertFails(getDoc(bobReference))
    await assertFails(getDocs(collection(bobFirestore(), 'users')))
    await assertFails(
      updateDoc(bobReference, {
        displayName: 'Compromised',
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('denies schema pollution and identity spoofing on create', async () => {
    const firestore = aliceFirestore()

    await assertFails(
      setDoc(doc(firestore, 'users/alice'), {
        ...validProfile(),
        role: 'admin',
      }),
    )

    await assertFails(
      setDoc(doc(firestore, 'users/alice'), {
        ...validProfile(),
        status: 'deactivated',
      }),
    )

    await assertFails(
      setDoc(doc(firestore, 'users/alice'), {
        ...validProfile(),
        email: 'bob@example.com',
      }),
    )
  })

  it('denies profiles with missing required fields', async () => {
    const reference = doc(aliceFirestore(), 'users/alice')

    await assertFails(
      setDoc(reference, {
        email: 'alice@example.com',
        displayName: 'Alice',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('denies oversized strings and invalid types', async () => {
    const firestore = aliceFirestore()
    const reference = doc(firestore, 'users/alice')

    await assertFails(
      setDoc(reference, {
        ...validProfile(),
        displayName: 'x'.repeat(81),
      }),
    )

    await assertFails(
      setDoc(reference, {
        ...validProfile(),
        displayName: 42,
      }),
    )
  })

  it('denies HTTP and oversized profile photo URLs', async () => {
    const reference = doc(aliceFirestore(), 'users/alice')

    await assertFails(
      setDoc(reference, {
        ...validProfile(),
        photoURL: 'http://example.com/alice.jpg',
      }),
    )

    await assertFails(
      setDoc(reference, {
        ...validProfile(),
        photoURL: `https://example.com/${'x'.repeat(2049)}`,
      }),
    )
  })

  it('denies client-controlled timestamps on create', async () => {
    const reference = doc(aliceFirestore(), 'users/alice')

    await assertFails(
      setDoc(reference, {
        ...validProfile(),
        createdAt: Timestamp.fromMillis(0),
        updatedAt: Timestamp.fromMillis(0),
      }),
    )
  })

  it('allows valid owner updates and protects immutable fields', async () => {
    const firestore = aliceFirestore()
    const reference = doc(firestore, 'users/alice')
    await setDoc(reference, validProfile())

    await assertSucceeds(
      updateDoc(reference, {
        displayName: 'Updated name',
        updatedAt: serverTimestamp(),
      }),
    )

    await assertFails(
      updateDoc(reference, {
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    )

    await assertFails(
      updateDoc(reference, {
        displayName: 'x'.repeat(81),
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('denies update bypasses and schema pollution', async () => {
    const reference = doc(aliceFirestore(), 'users/alice')
    await setDoc(reference, validProfile())

    await assertFails(
      updateDoc(reference, {
        role: 'admin',
        updatedAt: serverTimestamp(),
      }),
    )

    await assertFails(
      updateDoc(reference, {
        photoURL: 'http://example.com/compromised.jpg',
        updatedAt: serverTimestamp(),
      }),
    )

    await assertFails(
      updateDoc(reference, {
        email: 'bob@example.com',
        updatedAt: serverTimestamp(),
      }),
    )

    await assertFails(
      setDoc(reference, {
        displayName: 'Incomplete overwrite',
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('allows identity reconciliation when the Auth email changes', async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users/alice'), {
        ...validProfile(),
        email: 'old-alice@example.com',
      })
    })

    const firestore = testEnvironment
      .authenticatedContext('alice', {
        email: 'new-alice@example.com',
      })
      .firestore()

    await assertSucceeds(
      updateDoc(doc(firestore, 'users/alice'), {
        email: 'new-alice@example.com',
        photoURL: 'https://example.com/new-alice.jpg',
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('allows a legacy profile to be migrated to active status', async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      const profile = validProfile()
      delete profile.status
      await setDoc(doc(context.firestore(), 'users/alice'), profile)
    })

    await assertSucceeds(
      updateDoc(doc(aliceFirestore(), 'users/alice'), {
        status: 'active',
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('only lets a deactivated owner read status and reactivate', async () => {
    const reference = doc(aliceFirestore(), 'users/alice')
    await setDoc(reference, validProfile())

    await assertSucceeds(
      updateDoc(reference, {
        status: 'deactivated',
        updatedAt: serverTimestamp(),
      }),
    )

    await assertSucceeds(getDoc(reference))
    await assertFails(
      updateDoc(reference, {
        displayName: 'Blocked change',
        updatedAt: serverTimestamp(),
      }),
    )
    await assertFails(
      updateDoc(reference, {
        status: 'active',
        displayName: 'Blocked combined change',
        updatedAt: serverTimestamp(),
      }),
    )
    await assertSucceeds(
      updateDoc(reference, {
        status: 'active',
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('does not let a suspended owner reactivate or modify the profile', async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users/alice'), {
        ...validProfile(),
        status: 'suspended',
      })
    })

    const reference = doc(aliceFirestore(), 'users/alice')
    await assertSucceeds(getDoc(reference))
    await assertFails(
      updateDoc(reference, {
        status: 'active',
        updatedAt: serverTimestamp(),
      }),
    )
    await assertFails(
      updateDoc(reference, {
        displayName: 'Blocked change',
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('denies profile deletion', async () => {
    const firestore = aliceFirestore()
    const reference = doc(firestore, 'users/alice')
    await setDoc(reference, validProfile())

    await assertFails(deleteDoc(reference))
  })

  it('denies access to user subcollections', async () => {
    const reference = doc(aliceFirestore(), 'users/alice/private/secret')

    await assertFails(setDoc(reference, { value: 'private' }))
    await assertFails(getDoc(reference))
  })
})

function aliceFirestore() {
  return testEnvironment
    .authenticatedContext('alice', {
      email: 'alice@example.com',
    })
    .firestore()
}

function bobFirestore() {
  return testEnvironment
    .authenticatedContext('bob', {
      email: 'bob@example.com',
    })
    .firestore()
}

function validProfile() {
  return {
    email: 'alice@example.com',
    displayName: 'Alice',
    photoURL: 'https://example.com/alice.jpg',
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
}
