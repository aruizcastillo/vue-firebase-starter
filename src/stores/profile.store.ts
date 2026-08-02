import { computed, ref } from 'vue'
import { FirebaseError } from 'firebase/app'
import type { User } from 'firebase/auth'
import type { Unsubscribe } from 'firebase/firestore'
import { defineStore } from 'pinia'

import { observeUserProfile, reconcileUserProfile, setUserAccountStatus, updateUserProfile } from '@/services/profile.service'
import type { ProfileConnectionState, UserAccountStatus, UserProfile } from '@/types/profile.types'
import { getAuthErrorMessage } from '@/utils/auth-errors'
import { getProfileErrorMessage } from '@/utils/profile-errors'
import { i18n } from '@/i18n'

export const useProfileStore = defineStore('profile', () => {
  const profile = ref<UserProfile | null>(null)
  const connectionState = ref<ProfileConnectionState>('idle')
  const connectionError = ref<string | null>(null)
  const operationError = ref<string | null>(null)
  const updating = ref(false)

  let activeUserId: string | null = null
  let connectionGeneration = 0
  let connectionPromise: Promise<boolean> | null = null
  let connectionResolver: ((succeeded: boolean) => void) | null = null
  let unsubscribe: Unsubscribe | null = null

  const loading = computed(() => connectionState.value === 'connecting')

  function connect(currentUser: User): Promise<boolean> {
    if (activeUserId === currentUser.uid && connectionState.value === 'ready' && profile.value) {
      return Promise.resolve(true)
    }

    if (activeUserId === currentUser.uid && connectionPromise) {
      return connectionPromise
    }

    disconnect()

    activeUserId = currentUser.uid
    const currentGeneration = ++connectionGeneration
    connectionState.value = 'connecting'
    connectionError.value = null
    operationError.value = null

    const activeConnection = establishConnection(currentUser, currentGeneration)
    connectionPromise = activeConnection

    void activeConnection.finally(() => {
      if (connectionPromise === activeConnection) {
        connectionPromise = null
      }
    })

    return activeConnection
  }

  async function establishConnection(currentUser: User, currentGeneration: number): Promise<boolean> {
    try {
      await reconcileUserProfile(currentUser)

      if (!isCurrentConnection(currentUser.uid, currentGeneration)) return false

      return await waitForFirstSnapshot(currentUser.uid, currentGeneration)
    } catch (caughtError) {
      if (isCurrentConnection(currentUser.uid, currentGeneration)) {
        failConnection(caughtError)
      }

      return false
    }
  }

  function waitForFirstSnapshot(userId: string, currentGeneration: number): Promise<boolean> {
    return new Promise((resolve) => {
      let settled = false

      connectionResolver = (succeeded) => {
        if (settled) return
        settled = true
        connectionResolver = null
        resolve(succeeded)
      }

      unsubscribe = observeUserProfile(
        userId,
        (observedProfile) => {
          if (!isCurrentConnection(userId, currentGeneration)) return

          if (!observedProfile) {
            unsubscribe?.()
            unsubscribe = null
            failConnection(new Error('profile-creation-failed'))
            connectionResolver?.(false)
            return
          }

          profile.value = observedProfile
          connectionState.value = 'ready'
          connectionError.value = null
          connectionResolver?.(true)
        },
        (caughtError) => {
          if (!isCurrentConnection(userId, currentGeneration)) return

          unsubscribe = null
          failConnection(caughtError)
          connectionResolver?.(false)
        },
      )
    })
  }

  async function reconcile(currentUser: User | null): Promise<boolean> {
    if (!currentUser) {
      operationError.value = i18n.global.t('errors.noAuthenticatedUser')
      return false
    }

    operationError.value = null

    try {
      await reconcileUserProfile(currentUser)
      return true
    } catch (caughtError) {
      operationError.value = getProfileOperationErrorMessage(caughtError)
      return false
    }
  }

  async function update(currentUser: User | null, displayName: string): Promise<boolean> {
    if (!currentUser || activeUserId !== currentUser.uid) {
      operationError.value = i18n.global.t('errors.noAuthenticatedUser')
      return false
    }

    const currentGeneration = connectionGeneration
    updating.value = true
    operationError.value = null

    try {
      await updateUserProfile(currentUser, {
        displayName: displayName.trim(),
      })

      return isCurrentConnection(currentUser.uid, currentGeneration)
    } catch (caughtError) {
      if (isCurrentConnection(currentUser.uid, currentGeneration)) {
        operationError.value = getProfileOperationErrorMessage(caughtError)
      }

      return false
    } finally {
      if (isCurrentConnection(currentUser.uid, currentGeneration)) {
        updating.value = false
      }
    }
  }

  async function updateStatus(currentUser: User | null, status: UserAccountStatus): Promise<boolean> {
    if (!currentUser || activeUserId !== currentUser.uid) {
      operationError.value = i18n.global.t('errors.noAuthenticatedUser')
      return false
    }

    const currentGeneration = connectionGeneration
    updating.value = true
    operationError.value = null

    try {
      await setUserAccountStatus(currentUser.uid, status)
      return isCurrentConnection(currentUser.uid, currentGeneration)
    } catch (caughtError) {
      if (isCurrentConnection(currentUser.uid, currentGeneration)) {
        operationError.value = getProfileOperationErrorMessage(caughtError)
      }

      return false
    } finally {
      if (isCurrentConnection(currentUser.uid, currentGeneration)) {
        updating.value = false
      }
    }
  }

  function disconnect(): void {
    ++connectionGeneration
    unsubscribe?.()
    unsubscribe = null
    connectionResolver?.(false)
    connectionResolver = null
    connectionPromise = null
    activeUserId = null
    profile.value = null
    connectionState.value = 'idle'
    connectionError.value = null
    operationError.value = null
    updating.value = false
  }

  function failConnection(caughtError: unknown): void {
    profile.value = null
    connectionState.value = 'error'
    connectionError.value = getProfileErrorMessage(caughtError)
  }

  function isCurrentConnection(userId: string, currentGeneration: number): boolean {
    return activeUserId === userId && connectionGeneration === currentGeneration
  }

  function getProfileOperationErrorMessage(caughtError: unknown): string {
    if (caughtError instanceof FirebaseError && caughtError.code.startsWith('auth/')) {
      return getAuthErrorMessage(caughtError)
    }

    return getProfileErrorMessage(caughtError)
  }

  return {
    profile,
    connectionState,
    connectionError,
    operationError,
    loading,
    updating,
    connect,
    reconcile,
    update,
    updateStatus,
    disconnect,
  }
})
