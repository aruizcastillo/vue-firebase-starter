import { computed, markRaw, ref, shallowRef } from 'vue'
import { FirebaseError } from 'firebase/app'
import type { PasswordValidationStatus, User, UserCredential } from 'firebase/auth'
import { defineStore } from 'pinia'

import {
  checkPasswordAgainstPolicy,
  loginWithEmail,
  loginWithGoogle,
  logout,
  observeAuthState,
  registerWithEmail,
  resetPassword,
} from '@/services/auth.service'
import { ensureUserProfile, updateUserProfile } from '@/services/profile.service'
import type { AuthStatus } from '@/types/auth.types'
import type { UserProfile } from '@/types/profile.types'
import { getAuthErrorMessage } from '@/utils/auth-errors'
import { getProfileErrorMessage } from '@/utils/profile-errors'

export const useAuthStore = defineStore('auth', () => {
  // Firebase User is an opaque SDK object that can retain popup/window references.
  // Deep Vue reactivity can traverse those references and trigger cross-origin errors.
  const user = shallowRef<User | null>(null)
  const profile = ref<UserProfile | null>(null)
  const authStatus = ref<AuthStatus>('idle')
  const initialized = ref(false)
  const operationLoading = ref(false)
  const profileLoading = ref(false)
  const error = ref<string | null>(null)
  const profileError = ref<string | null>(null)

  let initializationPromise: Promise<void> | null = null
  let authStateVersion = 0
  let profileSyncPromise: Promise<UserProfile> | null = null
  let profileSyncUserId: string | null = null

  const isAuthenticated = computed(() => user.value !== null)
  const authLoading = computed(() => {
    return (
      authStatus.value === 'restoring' ||
      authStatus.value === 'authenticating' ||
      authStatus.value === 'signing-out'
    )
  })
  const loading = computed(() => {
    return authLoading.value || operationLoading.value || profileLoading.value
  })

  function clearError(): void {
    error.value = null
  }

  function clearProfileError(): void {
    profileError.value = null
  }

  function initialize(): Promise<void> {
    if (initialized.value) {
      return Promise.resolve()
    }

    if (initializationPromise) {
      return initializationPromise
    }

    authStatus.value = 'restoring'

    initializationPromise = new Promise((resolve) => {
      observeAuthState((currentUser) => {
        const stateVersion = ++authStateVersion

        if (currentUser) {
          setCurrentUser(currentUser)
          authStatus.value = 'authenticated'
          void synchronizeProfile(currentUser, stateVersion)
        } else {
          applySignedOutState()
        }

        if (!initialized.value) {
          initialized.value = true
          resolve()
        }
      })
    })

    return initializationPromise
  }

  function register(email: string, password: string): Promise<boolean> {
    return authenticate(() => registerWithEmail(email, password))
  }

  function login(email: string, password: string): Promise<boolean> {
    return authenticate(() => loginWithEmail(email, password))
  }

  function googleLogin(): Promise<boolean> {
    return authenticate(loginWithGoogle)
  }

  async function authenticate(operation: () => Promise<UserCredential>): Promise<boolean> {
    authStatus.value = 'authenticating'
    error.value = null

    try {
      const credential = await operation()

      setCurrentUser(credential.user)
      authStatus.value = 'authenticated'

      return true
    } catch (caughtError) {
      setAuthError(caughtError)
      authStatus.value = user.value ? 'authenticated' : 'unauthenticated'

      return false
    }
  }

  async function synchronizeProfile(currentUser: User, stateVersion: number): Promise<void> {
    if (isCurrentAuthState(currentUser, stateVersion)) {
      profileLoading.value = true
      profileError.value = null
    }

    if (!profileSyncPromise || profileSyncUserId !== currentUser.uid) {
      profileSyncUserId = currentUser.uid
      profileSyncPromise = ensureUserProfile(currentUser)
    }

    const activeSyncPromise = profileSyncPromise

    try {
      const syncedProfile = await activeSyncPromise

      if (isCurrentAuthState(currentUser, stateVersion)) {
        profile.value = syncedProfile
      }
    } catch (caughtError) {
      if (isCurrentAuthState(currentUser, stateVersion)) {
        profile.value = null
        profileError.value = getProfileErrorMessage(caughtError)
      }
    } finally {
      if (profileSyncPromise === activeSyncPromise) {
        profileSyncPromise = null
        profileSyncUserId = null
      }

      if (isCurrentAuthState(currentUser, stateVersion)) {
        profileLoading.value = false
      }
    }
  }

  async function reloadProfile(): Promise<boolean> {
    const currentUser = user.value

    if (!currentUser) {
      profileError.value = 'No authenticated user.'
      return false
    }

    await synchronizeProfile(currentUser, authStateVersion)

    return profile.value !== null
  }

  async function updateProfile(displayName: string): Promise<boolean> {
    const currentUser = user.value

    if (!currentUser) {
      error.value = 'No authenticated user.'
      return false
    }

    operationLoading.value = true
    error.value = null
    profileError.value = null

    try {
      const normalizedDisplayName = displayName.trim()

      await updateUserProfile(currentUser, {
        displayName: normalizedDisplayName,
      })

      if (profile.value) {
        profile.value = {
          ...profile.value,
          displayName: normalizedDisplayName,
        }
      }

      void reloadProfile()

      return true
    } catch (caughtError) {
      setProfileOperationError(caughtError)
      return false
    } finally {
      operationLoading.value = false
    }
  }

  async function signOut(): Promise<boolean> {
    authStatus.value = 'signing-out'
    error.value = null

    try {
      await logout()
      ++authStateVersion
      applySignedOutState()

      return true
    } catch (caughtError) {
      setAuthError(caughtError)
      authStatus.value = user.value ? 'authenticated' : 'unauthenticated'

      return false
    }
  }

  async function sendPasswordReset(email: string): Promise<boolean> {
    operationLoading.value = true
    error.value = null

    try {
      await resetPassword(email)
      return true
    } catch (caughtError) {
      if (isFirebaseErrorWithCode(caughtError, 'auth/user-not-found')) {
        return true
      }

      setAuthError(caughtError)
      return false
    } finally {
      operationLoading.value = false
    }
  }

  async function validateRegistrationPassword(
    password: string,
  ): Promise<PasswordValidationStatus | null> {
    operationLoading.value = true
    error.value = null

    try {
      return await checkPasswordAgainstPolicy(password)
    } catch (caughtError) {
      setAuthError(caughtError)
      return null
    } finally {
      operationLoading.value = false
    }
  }

  function applySignedOutState(): void {
    setCurrentUser(null)
    profile.value = null
    profileError.value = null
    profileLoading.value = false
    profileSyncPromise = null
    profileSyncUserId = null
    authStatus.value = 'unauthenticated'
  }

  function setCurrentUser(currentUser: User | null): void {
    user.value = currentUser ? markRaw(currentUser) : null
  }

  function isCurrentAuthState(currentUser: User, stateVersion: number): boolean {
    return authStateVersion === stateVersion && user.value?.uid === currentUser.uid
  }

  function setAuthError(caughtError: unknown): void {
    error.value = getAuthErrorMessage(caughtError)
  }

  function setProfileOperationError(caughtError: unknown): void {
    if (caughtError instanceof FirebaseError && caughtError.code.startsWith('auth/')) {
      setAuthError(caughtError)
      return
    }

    profileError.value = getProfileErrorMessage(caughtError)
  }

  function isFirebaseErrorWithCode(caughtError: unknown, code: string): boolean {
    return caughtError instanceof FirebaseError && caughtError.code === code
  }

  return {
    user,
    profile,
    authStatus,
    initialized,
    authLoading,
    operationLoading,
    profileLoading,
    loading,
    error,
    profileError,
    isAuthenticated,
    clearError,
    clearProfileError,
    initialize,
    register,
    login,
    googleLogin,
    reloadProfile,
    signOut,
    sendPasswordReset,
    updateProfile,
    validateRegistrationPassword,
  }
})
