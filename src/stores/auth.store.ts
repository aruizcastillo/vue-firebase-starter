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
import { useProfileStore } from '@/stores/profile.store'
import type { AuthStatus } from '@/types/auth.types'
import { getAuthErrorMessage } from '@/utils/auth-errors'

export const useAuthStore = defineStore('auth', () => {
  const profileStore = useProfileStore()

  // Firebase User is an opaque SDK object that can retain popup/window references.
  // Deep Vue reactivity can traverse those references and trigger cross-origin errors.
  const user = shallowRef<User | null>(null)
  const authStatus = ref<AuthStatus>('idle')
  const initialized = ref(false)
  const operationLoading = ref(false)
  const error = ref<string | null>(null)

  let initializationPromise: Promise<void> | null = null

  const isAuthenticated = computed(() => user.value !== null)
  const authLoading = computed(() => {
    return (
      authStatus.value === 'restoring' ||
      authStatus.value === 'authenticating' ||
      authStatus.value === 'signing-out'
    )
  })

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

    authStatus.value = 'restoring'

    initializationPromise = new Promise((resolve) => {
      observeAuthState((currentUser) => {
        if (currentUser) {
          setCurrentUser(currentUser)
          authStatus.value = 'authenticated'
          void profileStore.synchronize(currentUser)
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

  async function signOut(): Promise<boolean> {
    authStatus.value = 'signing-out'
    error.value = null

    try {
      await logout()
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
    profileStore.reset()
    authStatus.value = 'unauthenticated'
  }

  function setCurrentUser(currentUser: User | null): void {
    user.value = currentUser ? markRaw(currentUser) : null
  }

  function setAuthError(caughtError: unknown): void {
    error.value = getAuthErrorMessage(caughtError)
  }

  function isFirebaseErrorWithCode(caughtError: unknown, code: string): boolean {
    return caughtError instanceof FirebaseError && caughtError.code === code
  }

  return {
    user,
    authStatus,
    initialized,
    authLoading,
    operationLoading,
    error,
    isAuthenticated,
    clearError,
    initialize,
    register,
    login,
    googleLogin,
    signOut,
    sendPasswordReset,
    validateRegistrationPassword,
  }
})
