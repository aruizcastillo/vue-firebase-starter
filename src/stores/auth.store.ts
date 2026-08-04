import { computed, markRaw, ref, shallowRef, triggerRef } from 'vue'
import { FirebaseError } from 'firebase/app'
import type { PasswordValidationStatus, Unsubscribe, User, UserCredential } from 'firebase/auth'
import { defineStore } from 'pinia'

import { checkPasswordAgainstPolicy, loginWithEmail, loginWithGoogle, logout, observeAuthState, registerWithEmail, reloadAuthenticatedUser, resetPassword, updateAuthenticatedUserDisplayName } from '@/services/auth.service'
import type { AuthStatus } from '@/types/auth.types'
import { getAuthErrorMessage } from '@/utils/auth-errors'

export const useAuthStore = defineStore('auth', () => {
  // Firebase User is an opaque SDK object that can retain popup/window references.
  // Deep Vue reactivity can traverse those references and trigger cross-origin errors.
  const user = shallowRef<User | null>(null)
  const authStatus = ref<AuthStatus>('idle')
  const initialized = ref(false)
  const localTransition = ref(false)
  const operationLoading = ref(false)
  const identityUpdating = ref(false)
  const error = ref<string | null>(null)
  const observerError = ref<string | null>(null)

  let initializationPromise: Promise<void> | null = null
  let unsubscribeFromAuth: Unsubscribe | null = null
  const authStateWaiters = new Set<{
    userId: string | null
    resolve: () => void
    reject: (error: unknown) => void
  }>()

  const isAuthenticated = computed(() => user.value !== null)
  const authLoading = computed(() => {
    return authStatus.value === 'restoring' || authStatus.value === 'authenticating' || authStatus.value === 'signing-out'
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

    error.value = null
    observerError.value = null

    unsubscribeFromAuth?.()
    unsubscribeFromAuth = null

    initializationPromise = new Promise((resolve, reject) => {
      unsubscribeFromAuth = observeAuthState(
        (currentUser) => {
          observerError.value = null
          setCurrentUser(currentUser)
          authStatus.value = currentUser ? 'authenticated' : 'unauthenticated'

          if (!initialized.value) {
            initialized.value = true
            resolve()
          }
        },
        (caughtError) => {
          unsubscribeFromAuth?.()
          unsubscribeFromAuth = null
          setAuthError(caughtError)
          observerError.value = error.value
          authStatus.value = user.value ? 'authenticated' : 'unauthenticated'
          const initializationPending = !initialized.value
          initialized.value = false
          initializationPromise = null

          if (initializationPending) {
            reject(caughtError)
          }

          rejectAuthStateWaiters(caughtError)
        },
      )
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
    localTransition.value = true
    authStatus.value = 'authenticating'
    error.value = null

    try {
      if (!initialized.value) await initialize()

      const credential = await operation()
      await waitForObservedUser(credential.user.uid)

      return true
    } catch (caughtError) {
      setAuthError(caughtError)
      authStatus.value = user.value ? 'authenticated' : 'unauthenticated'

      return false
    } finally {
      localTransition.value = false
    }
  }

  async function signOut(): Promise<boolean> {
    localTransition.value = true
    authStatus.value = 'signing-out'
    error.value = null

    try {
      if (!initialized.value) await initialize()

      await logout()
      await waitForObservedUser(null)

      return true
    } catch (caughtError) {
      setAuthError(caughtError)
      authStatus.value = user.value ? 'authenticated' : 'unauthenticated'

      return false
    } finally {
      localTransition.value = false
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

  async function validateRegistrationPassword(password: string): Promise<PasswordValidationStatus | null> {
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

  async function updateDisplayName(displayName: string): Promise<boolean> {
    const currentUser = user.value
    if (!currentUser) return false

    identityUpdating.value = true
    error.value = null

    try {
      await updateAuthenticatedUserDisplayName(currentUser, displayName.trim())
      triggerRef(user)
      return true
    } catch (caughtError) {
      setAuthError(caughtError)
      return false
    } finally {
      identityUpdating.value = false
    }
  }

  async function refreshUser(): Promise<boolean> {
    const currentUser = user.value
    if (!currentUser) return false

    error.value = null

    try {
      await reloadAuthenticatedUser(currentUser)
      triggerRef(user)
      return true
    } catch (caughtError) {
      setAuthError(caughtError)
      return false
    }
  }

  function setCurrentUser(currentUser: User | null): void {
    user.value = currentUser ? markRaw(currentUser) : null

    const userId = currentUser?.uid ?? null
    for (const waiter of authStateWaiters) {
      if (waiter.userId !== userId) continue
      authStateWaiters.delete(waiter)
      waiter.resolve()
    }
  }

  function waitForObservedUser(userId: string | null): Promise<void> {
    if ((user.value?.uid ?? null) === userId) return Promise.resolve()

    return new Promise((resolve, reject) => {
      authStateWaiters.add({ userId, resolve, reject })
    })
  }

  function rejectAuthStateWaiters(caughtError: unknown): void {
    for (const waiter of authStateWaiters) {
      authStateWaiters.delete(waiter)
      waiter.reject(caughtError)
    }
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
    localTransition,
    authLoading,
    operationLoading,
    identityUpdating,
    error,
    observerError,
    isAuthenticated,
    clearError,
    initialize,
    register,
    login,
    googleLogin,
    signOut,
    sendPasswordReset,
    validateRegistrationPassword,
    updateDisplayName,
    refreshUser,
  }
})
