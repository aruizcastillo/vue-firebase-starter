import { serverTimestamp, type FieldValue, type Timestamp } from 'firebase/firestore'

import { authConfig } from '@/config/auth.config'

export type UserAccountStatus = 'active' | 'deactivated' | 'suspended'

export interface UserProfile {
  id: string
  status: UserAccountStatus | null
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export interface NewUserProfile {
  status?: UserAccountStatus
  createdAt: FieldValue
  updatedAt: FieldValue
}

export function createUserProfile(): NewUserProfile {
  return {
    ...(authConfig.requiresAccountStatus ? { status: 'active' } : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
}
