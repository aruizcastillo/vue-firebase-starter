import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { User } from 'firebase/auth'

import {
  loginWithEmail,
  loginWithGoogle,
  logout,
  observeAuthState,
  registerWithEmail,
  resetPassword,
} from '@/services/auth.service'

import { getAuthErrorMessage } from '@/utils/auth-errors'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const initialized = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  let initializationPromise: Promise<void> | null = null

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
      observeAuthState((currentUser) => {
        user.value = currentUser
        initialized.value = true
        resolve()
      })
    })

    return initializationPromise
  }

  async function register(email: string, password: string): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      await registerWithEmail(email, password)
      return true
    } catch (caughtError) {
      error.value = getAuthErrorMessage(caughtError)
      return false
    } finally {
      loading.value = false
    }
  }

  async function login(email: string, password: string): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      await loginWithEmail(email, password)
      return true
    } catch (caughtError) {
      error.value = getAuthErrorMessage(caughtError)
      return false
    } finally {
      loading.value = false
    }
  }

  async function googleLogin(): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      await loginWithGoogle()
      return true
    } catch (caughtError) {
      error.value = getAuthErrorMessage(caughtError)
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
      return true
    } catch (caughtError) {
      error.value = getAuthErrorMessage(caughtError)
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
      error.value = getAuthErrorMessage(caughtError)
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    user,
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
  }
})
