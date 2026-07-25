import type { Timestamp } from 'firebase/firestore'

export interface UserProfile {
  id: string
  email: string | null
  displayName: string
  photoURL: string | null
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export interface UpdateUserProfileData {
  displayName: string
}
