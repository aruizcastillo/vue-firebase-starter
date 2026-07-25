import { FirebaseError } from 'firebase/app'

const authErrorMessages: Record<string, string> = {
  'auth/email-already-in-use': 'An account already exists with this email address.',

  'auth/invalid-email': 'The email address is not valid.',

  'auth/invalid-credential': 'The email address or password is incorrect.',

  'auth/user-not-found': 'The email address or password is incorrect.',

  'auth/wrong-password': 'The email address or password is incorrect.',

  'auth/weak-password': 'The password must be at least 6 characters long.',

  'auth/user-disabled': 'This account has been disabled.',

  'auth/too-many-requests': 'Too many attempts have been made. Please try again later.',

  'auth/network-request-failed': 'Could not connect to the authentication service.',

  'auth/popup-closed-by-user': 'The Google sign-in window was closed.',

  'auth/popup-blocked': 'The browser blocked the Google sign-in window.',

  'auth/account-exists-with-different-credential':
    'An account already exists with this email address using a different sign-in method.',
}

export function getAuthErrorMessage(error: unknown): string {
  if (!(error instanceof FirebaseError)) {
    return 'An unexpected error occurred.'
  }

  return authErrorMessages[error.code] ?? 'The operation could not be completed.'
}
