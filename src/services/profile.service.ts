import { updateProfile as updateAuthProfile, type User } from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'

import { db } from '@/firebase/firestore'

import type { UpdateUserProfileData, UserProfile } from '@/types/profile.types'

function getUserReference(userId: string) {
  return doc(db, 'users', userId)
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(getUserReference(userId))

  if (!snapshot.exists()) {
    return null
  }

  const data = snapshot.data()

  return {
    id: snapshot.id,
    email: typeof data.email === 'string' ? data.email : null,
    displayName: typeof data.displayName === 'string' ? data.displayName : '',
    photoURL: typeof data.photoURL === 'string' ? data.photoURL : null,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  }
}

export async function createUserProfile(user: User): Promise<void> {
  await setDoc(getUserReference(user.uid), {
    email: user.email,
    displayName: user.displayName ?? '',
    photoURL: user.photoURL,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const existingProfile = await getUserProfile(user.uid)

  if (existingProfile) {
    return existingProfile
  }

  await createUserProfile(user)

  const createdProfile = await getUserProfile(user.uid)

  if (!createdProfile) {
    throw new Error('The user profile could not be created.')
  }

  return createdProfile
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
