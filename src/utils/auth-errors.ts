import { FirebaseError } from 'firebase/app'
import { i18n } from '@/i18n'

const authErrorKeys: Record<string, string> = {
  'auth/email-already-in-use': 'errors.emailAlreadyInUse',
  'auth/invalid-email': 'errors.invalidEmail',
  'auth/invalid-credential': 'errors.invalidCredential',
  'auth/user-not-found': 'errors.invalidCredential',
  'auth/wrong-password': 'errors.invalidCredential',
  'auth/weak-password': 'errors.weakPassword',
  'auth/user-disabled': 'errors.userDisabled',
  'auth/too-many-requests': 'errors.tooManyRequests',
  'auth/network-request-failed': 'errors.authNetwork',
  'auth/popup-closed-by-user': 'errors.popupClosed',
  'auth/popup-blocked': 'errors.popupBlocked',
  'auth/account-exists-with-different-credential': 'errors.differentCredential',
  'auth/requires-recent-login': 'errors.recentLogin',
  'auth/credential-too-old-login-again': 'errors.recentLogin',
}

export function getAuthErrorMessage(error: unknown): string {
  if (!(error instanceof FirebaseError)) return i18n.global.t('errors.unexpected')
  return i18n.global.t(authErrorKeys[error.code] ?? 'errors.operationFailed')
}
