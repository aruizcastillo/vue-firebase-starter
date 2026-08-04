import { computed, ref } from 'vue'
import type { User } from 'firebase/auth'
import type { Unsubscribe } from 'firebase/firestore'
import { defineStore } from 'pinia'

import { authConfig } from '@/config/auth.config'
import { ensureUserProfile, getUserProfile, observeUserProfile, setUserAccountStatus } from '@/services/profile.service'
import type { ProfileConnectionState, UserAccountStatus, UserProfile } from '@/types/profile.types'
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

  function load(currentUser: User): Promise<boolean> {
    return startProfileOperation(currentUser, loadProfile)
  }

  function connect(currentUser: User): Promise<boolean> {
    return startProfileOperation(currentUser, establishConnection)
  }

  function startProfileOperation(currentUser: User, operation: (currentUser: User, currentGeneration: number) => Promise<boolean>): Promise<boolean> {
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

    const activeConnection = operation(currentUser, currentGeneration)
    connectionPromise = activeConnection

    void activeConnection.finally(() => {
      if (connectionPromise === activeConnection) {
        connectionPromise = null
      }
    })

    return activeConnection
  }

  async function loadProfile(currentUser: User, currentGeneration: number): Promise<boolean> {
    try {
      await ensureUserProfile(currentUser.uid)

      if (!isCurrentConnection(currentUser.uid, currentGeneration)) return false

      const loadedProfile = await getUserProfile(currentUser.uid)
      if (!isCurrentConnection(currentUser.uid, currentGeneration)) return false

      if (!loadedProfile) {
        failConnection(new Error('profile-creation-failed'))
        return false
      }

      if (authConfig.requiresAccountStatus && !loadedProfile.status) {
        failConnection(new Error('invalid-profile-document'))
        return false
      }

      profile.value = loadedProfile
      connectionState.value = 'ready'
      connectionError.value = null
      return true
    } catch (caughtError) {
      if (isCurrentConnection(currentUser.uid, currentGeneration)) {
        failConnection(caughtError)
      }

      return false
    }
  }

  async function establishConnection(currentUser: User, currentGeneration: number): Promise<boolean> {
    try {
      await ensureUserProfile(currentUser.uid)

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

          if (authConfig.requiresAccountStatus && !observedProfile.status) {
            unsubscribe?.()
            unsubscribe = null
            failConnection(new Error('invalid-profile-document'))
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
        operationError.value = getProfileErrorMessage(caughtError)
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

  return {
    profile,
    connectionState,
    connectionError,
    operationError,
    loading,
    updating,
    load,
    connect,
    updateStatus,
    disconnect,
  }
})
