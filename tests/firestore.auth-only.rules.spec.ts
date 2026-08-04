import { readFileSync } from 'node:fs'

import { assertFails, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore'
import { afterAll, beforeAll, describe, it } from 'vitest'

const emulatorUrl = new URL(`http://${process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'}`)

let testEnvironment: RulesTestEnvironment

describe('Firestore auth-only rules', () => {
  beforeAll(async () => {
    testEnvironment = await initializeTestEnvironment({
      projectId: 'demo-vue-firebase-starter-auth-only',
      firestore: {
        host: emulatorUrl.hostname,
        port: Number(emulatorUrl.port),
        rules: readFileSync('firestore.rules', 'utf8'),
      },
    })
  })

  afterAll(async () => {
    await testEnvironment?.cleanup()
  })

  it.each([
    ['unauthenticated', () => testEnvironment.unauthenticatedContext().firestore()],
    ['authenticated', () => testEnvironment.authenticatedContext('alice').firestore()],
  ])('default-denies all %s Firestore access', async (_label, getFirestore) => {
    const firestore = getFirestore()

    await assertFails(getDoc(doc(firestore, 'users/alice')))
    await assertFails(getDocs(collection(firestore, 'users')))
    await assertFails(setDoc(doc(firestore, 'users/alice'), { createdAt: new Date() }))
    await assertFails(setDoc(doc(firestore, 'business/example'), { value: 'not configured' }))
  })
})
