import { doc, getDoc, onSnapshot, runTransaction, serverTimestamp, updateDoc, type DocumentSnapshot, type Unsubscribe } from 'firebase/firestore'

import { db } from '@/firebase/firestore'

import { createUserProfile, type UserAccountStatus, type UserProfile } from '@/models/profile.model'

function getUserReference(userId: string) {
  return doc(db, 'users', userId)
}

function mapUserProfile(snapshot: DocumentSnapshot): UserProfile {
  const data = snapshot.data()
  if (!data) throw new Error('profile-not-found')

  return {
    ...data,
    id: snapshot.id,
    status: data.status === 'active' || data.status === 'deactivated' || data.status === 'suspended' ? data.status : null,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  } as UserProfile
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(getUserReference(userId))
  return snapshot.exists() ? mapUserProfile(snapshot) : null
}

export async function ensureUserProfile(userId: string): Promise<void> {
  const reference = getUserReference(userId)

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reference)
    if (snapshot.exists()) return

    transaction.set(reference, createUserProfile())
  })
}

export function observeUserProfile(userId: string, callback: (profile: UserProfile | null) => void, errorCallback: (error: Error) => void): Unsubscribe {
  return onSnapshot(getUserReference(userId), (snapshot) => callback(snapshot.exists() ? mapUserProfile(snapshot) : null), errorCallback)
}

export async function setUserAccountStatus(userId: string, status: UserAccountStatus): Promise<void> {
  await updateDoc(getUserReference(userId), {
    status,
    updatedAt: serverTimestamp(),
  })
}
