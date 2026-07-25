import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { User } from 'firebase/auth'
import { FirebaseError } from 'firebase/app'

import {
  loginWithEmail,
  loginWithGoogle,
  logout,
  observeAuthState,
  registerWithEmail,
  resetPassword,
} from '@/services/auth.service'

import { getAuthErrorMessage } from '@/utils/auth-errors'
import type { UserProfile } from '@/types/profile.types'
import { ensureUserProfile, updateUserProfile, getUserProfile } from '@/services/profile.service'
import { getProfileErrorMessage } from '@/utils/profile-errors'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const profile = ref<UserProfile | null>(null)
  const initialized = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  let initializationPromise: Promise<void> | null = null
  let profileSyncPromise: Promise<UserProfile> | null = null
  let profileSyncUserId: string | null = null

  const isAuthenticated = computed(() => user.value !== null)

  function clearError(): void {
    error.value = null
  }

  function initialize(): Promise<void> {
    if (initialized.value) {
      return Promise.resolve()
    }

    if (initializationPromise) {
      return initializationPromise
    }

    initializationPromise = new Promise((resolve) => {
      observeAuthState(async (currentUser) => {
        const foregroundOperationInProgress = loading.value

        if (!foregroundOperationInProgress) {
          error.value = null
        }

        try {
          if (currentUser) {
            await syncAuthenticatedUser(currentUser)
          } else {
            user.value = null
            profile.value = null
          }
        } catch (caughtError) {
          user.value = currentUser
          profile.value = null

          if (!foregroundOperationInProgress) {
            error.value = getProfileErrorMessage(caughtError)
          }
        } finally {
          initialized.value = true
          resolve()
        }
      })
    })

    return initializationPromise
  }

  async function register(email: string, password: string): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      const credential = await registerWithEmail(email, password)

      await syncAuthenticatedUser(credential.user)
      error.value = null

      return true
    } catch (caughtError) {
      setOperationError(caughtError)
      return false
    } finally {
      loading.value = false
    }
  }

  async function login(email: string, password: string): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      const credential = await loginWithEmail(email, password)

      await syncAuthenticatedUser(credential.user)
      error.value = null

      return true
    } catch (caughtError) {
      setOperationError(caughtError)
      return false
    } finally {
      loading.value = false
    }
  }

  async function googleLogin(): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      const credential = await loginWithGoogle()

      await syncAuthenticatedUser(credential.user)
      error.value = null

      return true
    } catch (caughtError) {
      setOperationError(caughtError)
      return false
    } finally {
      loading.value = false
    }
  }

  async function syncAuthenticatedUser(currentUser: User): Promise<void> {
    user.value = currentUser

    if (!profileSyncPromise || profileSyncUserId !== currentUser.uid) {
      profileSyncUserId = currentUser.uid
      profileSyncPromise = ensureUserProfile(currentUser)
    }

    const activeSyncPromise = profileSyncPromise

    try {
      const syncedProfile = await activeSyncPromise

      if (user.value?.uid === currentUser.uid) {
        profile.value = syncedProfile
      }
    } finally {
      if (profileSyncPromise === activeSyncPromise) {
        profileSyncPromise = null
        profileSyncUserId = null
      }
    }
  }

  async function updateProfile(displayName: string): Promise<boolean> {
    if (!user.value) {
      error.value = 'No authenticated user.'
      return false
    }

    loading.value = true
    error.value = null

    try {
      const normalizedDisplayName = displayName.trim()

      await updateUserProfile(user.value, {
        displayName: normalizedDisplayName,
      })

      profile.value = await getUserProfile(user.value.uid)

      if (!profile.value) {
        throw new Error('The user profile could not be loaded after updating it.')
      }

      return true
    } catch (caughtError) {
      setOperationError(caughtError)
      return false
    } finally {
      loading.value = false
    }
  }

  async function signOut(): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      await logout()

      user.value = null
      profile.value = null

      return true
    } catch (caughtError) {
      setOperationError(caughtError)
      return false
    } finally {
      loading.value = false
    }
  }

  async function sendPasswordReset(email: string): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      await resetPassword(email)
      return true
    } catch (caughtError) {
      setOperationError(caughtError)
      return false
    } finally {
      loading.value = false
    }
  }

  function setOperationError(caughtError: unknown): void {
    if (!(caughtError instanceof FirebaseError)) {
      error.value = 'An unexpected error occurred.'
      return
    }

    if (caughtError.code.startsWith('auth/')) {
      error.value = getAuthErrorMessage(caughtError)
      return
    }

    error.value = getProfileErrorMessage(caughtError)
  }

  return {
    user,
    profile,
    initialized,
    loading,
    error,
    isAuthenticated,
    clearError,
    initialize,
    register,
    login,
    googleLogin,
    signOut,
    sendPasswordReset,
    updateProfile,
  }
})
