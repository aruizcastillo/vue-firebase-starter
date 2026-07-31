import { GoogleAuthProvider, createUserWithEmailAndPassword, EmailAuthProvider, onAuthStateChanged, reauthenticateWithCredential, reauthenticateWithPopup, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut, updatePassword, verifyBeforeUpdateEmail, validatePassword, type PasswordValidationStatus, type Unsubscribe, type User, type UserCredential } from 'firebase/auth'

import { auth } from '@/firebase/auth'
import { useFirebaseEmulators } from '@/firebase/config'
import { getEmulatorPasswordValidationStatus } from '@/utils/password-policy'

const googleProvider = new GoogleAuthProvider()

export const authServiceErrorCodes = {
  passwordConfirmationRequired: 'password-confirmation-required',
  emailChangeUnavailable: 'email-change-unavailable',
} as const

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

export async function requestEmailChange(user: User, newEmail: string, password?: string): Promise<void> {
  const providers = user.providerData.map((provider) => provider.providerId)

  if (providers.includes('password')) {
    if (!password) {
      throw new Error(authServiceErrorCodes.passwordConfirmationRequired)
    }

    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email ?? '', password))
  } else if (providers.includes('google.com')) {
    await reauthenticateWithPopup(user, googleProvider)
  } else {
    throw new Error(authServiceErrorCodes.emailChangeUnavailable)
  }

  await verifyBeforeUpdateEmail(user, newEmail)
}

export async function changePassword(user: User, currentPassword: string, newPassword: string): Promise<void> {
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email ?? '', currentPassword))
  await updatePassword(user, newPassword)
}

export async function reloadAuthenticatedUser(user: User): Promise<void> {
  await user.reload()
  await user.getIdToken(true)
}

export function checkPasswordAgainstPolicy(password: string): Promise<PasswordValidationStatus> {
  // The Auth Emulator does not implement the v2 passwordPolicy endpoint.
  if (useFirebaseEmulators) {
    return Promise.resolve(getEmulatorPasswordValidationStatus(password))
  }

  return validatePassword(auth, password)
}

export function observeAuthState(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback)
}
