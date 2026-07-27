import type { Timestamp } from 'firebase/firestore'

export type UserAccountStatus = 'active' | 'deactivated' | 'suspended'

export interface UserProfile {
  id: string
  email: string | null
  displayName: string
  photoURL: string | null
  status: UserAccountStatus
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export interface UpdateUserProfileData {
  displayName: string
}
