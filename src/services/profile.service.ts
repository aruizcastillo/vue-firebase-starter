import { updateProfile as updateAuthProfile, type User } from 'firebase/auth'
import { doc, onSnapshot, runTransaction, serverTimestamp, updateDoc, type QueryDocumentSnapshot, type Unsubscribe } from 'firebase/firestore'

import { db } from '@/firebase/firestore'

import type { UpdateUserProfileData, UserAccountStatus, UserProfile } from '@/types/profile.types'

function getUserReference(userId: string) {
  return doc(db, 'users', userId)
}

function mapUserProfile(snapshot: QueryDocumentSnapshot): UserProfile {
  const data = snapshot.data()

  return {
    id: snapshot.id,
    email: typeof data.email === 'string' ? data.email : null,
    displayName: typeof data.displayName === 'string' ? data.displayName : '',
    photoURL: typeof data.photoURL === 'string' ? data.photoURL : null,
    status: data.status === 'deactivated' || data.status === 'suspended' ? data.status : 'active',
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  }
}

export async function reconcileUserProfile(user: User): Promise<void> {
  const reference = getUserReference(user.uid)

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reference)
    const authProfile = {
      email: user.email,
      displayName: user.displayName ?? '',
      photoURL: user.photoURL,
    }

    if (!snapshot.exists()) {
      transaction.set(reference, {
        ...authProfile,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      return
    }

    const data = snapshot.data()
    const identityChanged = data.email !== authProfile.email || data.displayName !== authProfile.displayName || data.photoURL !== authProfile.photoURL

    // A deactivated or suspended account may not reconcile identity fields.
    // Do not reconcile identity fields until it is active again.
    if (data.status !== 'deactivated' && data.status !== 'suspended' && (identityChanged || data.status !== 'active')) {
      transaction.update(reference, {
        ...authProfile,
        status: 'active',
        updatedAt: serverTimestamp(),
      })
    }
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

export async function updateUserProfile(user: User, data: UpdateUserProfileData): Promise<void> {
  await updateAuthProfile(user, {
    displayName: data.displayName,
  })

  await updateDoc(getUserReference(user.uid), {
    displayName: data.displayName,
    updatedAt: serverTimestamp(),
  })
}
