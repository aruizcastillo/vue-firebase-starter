import { FirebaseError } from 'firebase/app'

const profileErrorMessages: Record<string, string> = {
  'permission-denied': 'You do not have permission to perform this operation.',

  unavailable: 'The service is temporarily unavailable.',

  'not-found': 'The user profile could not be found.',

  'auth/network-request-failed': 'Could not connect to the service.',
}

export function getProfileErrorMessage(error: unknown): string {
  if (!(error instanceof FirebaseError)) {
    return 'The operation could not be completed.'
  }

  return profileErrorMessages[error.code] ?? 'The operation could not be completed.'
}
