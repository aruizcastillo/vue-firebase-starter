import { FirebaseError } from 'firebase/app'
import { i18n } from '@/i18n'

const profileErrorKeys: Record<string, string> = {
  'permission-denied': 'errors.permissionDenied',
  unavailable: 'errors.serviceUnavailable',
  'not-found': 'errors.profileNotFound',
  'auth/network-request-failed': 'errors.serviceNetwork',
}

export function getProfileErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message === 'profile-creation-failed') return i18n.global.t('errors.profileCreationFailed')
  if (!(error instanceof FirebaseError)) return i18n.global.t('errors.operationFailed')
  return i18n.global.t(profileErrorKeys[error.code] ?? 'errors.operationFailed')
}
