import type { Timestamp } from 'firebase/firestore'

export type UserAccountStatus = 'active' | 'deactivated' | 'suspended'

export type ProfileConnectionState = 'idle' | 'connecting' | 'ready' | 'error'

export interface UserProfile {
  id: string
  status: UserAccountStatus | null
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}
