import { connectAuthEmulator } from 'firebase/auth'
import { connectFirestoreEmulator } from 'firebase/firestore'

import { auth } from './auth'
import { db } from './firestore'
import { useFirebaseEmulators } from './config'

let connected = false

export function connectFirebaseEmulators(): void {
  if (connected || !import.meta.env.DEV || !useFirebaseEmulators) {
    return
  }

  connectAuthEmulator(auth, 'http://127.0.0.1:9099', {
    disableWarnings: true,
  })

  connectFirestoreEmulator(db, '127.0.0.1', 8080)

  connected = true
}
