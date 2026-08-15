import { computed, ref } from 'vue'
import type { User } from 'firebase/auth'
import type { Unsubscribe } from 'firebase/firestore'
import { defineStore } from 'pinia'

import { authConfig } from '@/config/auth.config'
import { ensureUserProfile, getUserProfile, observeUserProfile, setUserAccountStatus } from '@/services/profile.service'
import type { UserAccountStatus, UserProfile } from '@/models/profile.model'
import { getProfileErrorMessage } from '@/utils/profile-errors'
import { i18n } from '@/i18n'

type ProfileOperationState = 'idle' | 'connecting' | 'ready' | 'error'

export const useProfileStore = defineStore('profile', () => {
  const profile = ref<UserProfile | null>(null)
  const state = ref<ProfileOperationState>('idle')
  const error = ref<string | null>(null)
  const operationError = ref<string | null>(null)
  const updating = ref(false)

  let activeUserId: string | null = null
  let operationGeneration = 0
  let activeOperation: Promise<boolean> | null = null
  let operationResolver: ((succeeded: boolean) => void) | null = null
  let unsubscribe: Unsubscribe | null = null

  const loading = computed(() => state.value === 'connecting')

  function load(currentUser: User): Promise<boolean> {
    return startOperation(currentUser, loadProfile)
  }

  function connect(currentUser: User): Promise<boolean> {
    return startOperation(currentUser, establishConnection)
  }

  function startOperation(currentUser: User, operation: (currentUser: User, currentGeneration: number) => Promise<boolean>): Promise<boolean> {
    if (activeUserId === currentUser.uid && state.value === 'ready' && profile.value) {
      return Promise.resolve(true)
    }

    if (activeUserId === currentUser.uid && activeOperation) {
      return activeOperation
    }

    disconnect()

    activeUserId = currentUser.uid
    const currentGeneration = ++operationGeneration
    state.value = 'connecting'
    error.value = null
    operationError.value = null

    const currentOperation = operation(currentUser, currentGeneration)
    activeOperation = currentOperation

    void currentOperation.finally(() => {
      if (activeOperation === currentOperation) {
        activeOperation = null
      }
    })

    return currentOperation
  }

  async function loadProfile(currentUser: User, currentGeneration: number): Promise<boolean> {
    try {
      await ensureUserProfile(currentUser.uid)

      if (!isCurrentOperation(currentUser.uid, currentGeneration)) return false

      const loadedProfile = await getUserProfile(currentUser.uid)
      if (!isCurrentOperation(currentUser.uid, currentGeneration)) return false

      if (!loadedProfile) {
        failOperation(new Error('profile-creation-failed'))
        return false
      }

      if (authConfig.requiresAccountStatus && !loadedProfile.status) {
        failOperation(new Error('invalid-profile-document'))
        return false
      }

      profile.value = loadedProfile
      state.value = 'ready'
      error.value = null
      return true
    } catch (caughtError) {
      if (isCurrentOperation(currentUser.uid, currentGeneration)) {
        failOperation(caughtError)
      }

      return false
    }
  }

  async function establishConnection(currentUser: User, currentGeneration: number): Promise<boolean> {
    try {
      await ensureUserProfile(currentUser.uid)

      if (!isCurrentOperation(currentUser.uid, currentGeneration)) return false

      return await waitForFirstSnapshot(currentUser.uid, currentGeneration)
    } catch (caughtError) {
      if (isCurrentOperation(currentUser.uid, currentGeneration)) {
        failOperation(caughtError)
      }

      return false
    }
  }

  function waitForFirstSnapshot(userId: string, currentGeneration: number): Promise<boolean> {
    return new Promise((resolve) => {
      let settled = false

      operationResolver = (succeeded) => {
        if (settled) return
        settled = true
        operationResolver = null
        resolve(succeeded)
      }

      unsubscribe = observeUserProfile(
        userId,
        (observedProfile) => {
          if (!isCurrentOperation(userId, currentGeneration)) return

          if (!observedProfile) {
            unsubscribe?.()
            unsubscribe = null
            failOperation(new Error('profile-creation-failed'))
            operationResolver?.(false)
            return
          }

          if (authConfig.requiresAccountStatus && !observedProfile.status) {
            unsubscribe?.()
            unsubscribe = null
            failOperation(new Error('invalid-profile-document'))
            operationResolver?.(false)
            return
          }

          profile.value = observedProfile
          state.value = 'ready'
          error.value = null
          operationResolver?.(true)
        },
        (caughtError) => {
          if (!isCurrentOperation(userId, currentGeneration)) return

          unsubscribe = null
          failOperation(caughtError)
          operationResolver?.(false)
        },
      )
    })
  }

  async function updateStatus(currentUser: User | null, status: UserAccountStatus): Promise<boolean> {
    if (!currentUser || activeUserId !== currentUser.uid) {
      operationError.value = i18n.global.t('errors.noAuthenticatedUser')
      return false
    }

    const currentGeneration = operationGeneration
    updating.value = true
    operationError.value = null

    try {
      await setUserAccountStatus(currentUser.uid, status)
      return isCurrentOperation(currentUser.uid, currentGeneration)
    } catch (caughtError) {
      if (isCurrentOperation(currentUser.uid, currentGeneration)) {
        operationError.value = getProfileErrorMessage(caughtError)
      }

      return false
    } finally {
      if (isCurrentOperation(currentUser.uid, currentGeneration)) {
        updating.value = false
      }
    }
  }

  function disconnect(): void {
    ++operationGeneration
    unsubscribe?.()
    unsubscribe = null
    operationResolver?.(false)
    operationResolver = null
    activeOperation = null
    activeUserId = null
    profile.value = null
    state.value = 'idle'
    error.value = null
    operationError.value = null
    updating.value = false
  }

  function failOperation(caughtError: unknown): void {
    profile.value = null
    state.value = 'error'
    error.value = getProfileErrorMessage(caughtError)
  }

  function isCurrentOperation(userId: string, currentGeneration: number): boolean {
    return activeUserId === userId && operationGeneration === currentGeneration
  }

  return {
    profile,
    state,
    error,
    operationError,
    loading,
    updating,
    load,
    connect,
    updateStatus,
    disconnect,
  }
})
