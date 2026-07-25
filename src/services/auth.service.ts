import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type Unsubscribe,
  type User,
  type UserCredential,
} from 'firebase/auth'

import { auth } from '@/firebase/auth'

const googleProvider = new GoogleAuthProvider()

export function registerWithEmail(email: string, password: string): Promise<UserCredential> {
  return createUserWithEmailAndPassword(auth, email, password)
}

export function loginWithEmail(email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password)
}

export function loginWithGoogle(): Promise<UserCredential> {
  return signInWithPopup(auth, googleProvider)
}

export function logout(): Promise<void> {
  return signOut(auth)
}

export function resetPassword(email: string): Promise<void> {
  return sendPasswordResetEmail(auth, email)
}

export function observeAuthState(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback)
}
