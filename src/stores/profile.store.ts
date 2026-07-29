import { ref } from 'vue'
import { FirebaseError } from 'firebase/app'
import type { User } from 'firebase/auth'
import { defineStore } from 'pinia'

import {
  ensureUserProfile,
  setUserAccountStatus,
  updateUserProfile,
} from '@/services/profile.service'
import type { UserAccountStatus, UserProfile } from '@/types/profile.types'
import { getAuthErrorMessage } from '@/utils/auth-errors'
import { getProfileErrorMessage } from '@/utils/profile-errors'
import { i18n } from '@/i18n'

export const useProfileStore = defineStore('profile', () => {
  const profile = ref<UserProfile | null>(null)
  const loading = ref(false)
  const updating = ref(false)
  const error = ref<string | null>(null)

  let activeUserId: string | null = null
  let stateVersion = 0
  let synchronizationPromise: Promise<UserProfile> | null = null
  let synchronizationUserId: string | null = null

  async function synchronize(currentUser: User): Promise<boolean> {
    const currentStateVersion = activateUser(currentUser.uid)

    if (isCurrentState(currentUser.uid, currentStateVersion)) {
      loading.value = true
      error.value = null
    }

    if (!synchronizationPromise || synchronizationUserId !== currentUser.uid) {
      synchronizationUserId = currentUser.uid
      synchronizationPromise = ensureUserProfile(currentUser)
    }

    const activeSynchronization = synchronizationPromise

    try {
      const synchronizedProfile = await activeSynchronization

      if (isCurrentState(currentUser.uid, currentStateVersion)) {
        profile.value = synchronizedProfile
      }

      return true
    } catch (caughtError) {
      if (isCurrentState(currentUser.uid, currentStateVersion)) {
        profile.value = null
        error.value = getProfileErrorMessage(caughtError)
      }

      return false
    } finally {
      if (synchronizationPromise === activeSynchronization) {
        synchronizationPromise = null
        synchronizationUserId = null
      }

      if (isCurrentState(currentUser.uid, currentStateVersion)) {
        loading.value = false
      }
    }
  }

  async function reload(currentUser: User | null): Promise<boolean> {
    if (!currentUser) {
      error.value = i18n.global.t('errors.noAuthenticatedUser')
      return false
    }

    return synchronize(currentUser)
  }

  async function update(currentUser: User | null, displayName: string): Promise<boolean> {
    if (!currentUser) {
      error.value = i18n.global.t('errors.noAuthenticatedUser')
      return false
    }

    const currentStateVersion = activateUser(currentUser.uid)

    updating.value = true
    error.value = null

    try {
      const normalizedDisplayName = displayName.trim()

      await updateUserProfile(currentUser, {
        displayName: normalizedDisplayName,
      })

      if (isCurrentState(currentUser.uid, currentStateVersion)) {
        if (profile.value) {
          profile.value = {
            ...profile.value,
            displayName: normalizedDisplayName,
          }
        }

        void synchronize(currentUser)
      }

      return true
    } catch (caughtError) {
      if (isCurrentState(currentUser.uid, currentStateVersion)) {
        error.value = getProfileOperationErrorMessage(caughtError)
      }

      return false
    } finally {
      if (isCurrentState(currentUser.uid, currentStateVersion)) {
        updating.value = false
      }
    }
  }

  async function updateStatus(
    currentUser: User | null,
    status: UserAccountStatus,
  ): Promise<boolean> {
    if (!currentUser) {
      error.value = i18n.global.t('errors.noAuthenticatedUser')
      return false
    }

    const currentStateVersion = activateUser(currentUser.uid)
    updating.value = true
    error.value = null

    try {
      await setUserAccountStatus(currentUser.uid, status)

      if (isCurrentState(currentUser.uid, currentStateVersion) && profile.value) {
        profile.value = { ...profile.value, status }
      }

      return true
    } catch (caughtError) {
      if (isCurrentState(currentUser.uid, currentStateVersion)) {
        error.value = getProfileOperationErrorMessage(caughtError)
      }
      return false
    } finally {
      if (isCurrentState(currentUser.uid, currentStateVersion)) {
        updating.value = false
      }
    }
  }

  function reset(): void {
    ++stateVersion
    activeUserId = null
    synchronizationPromise = null
    synchronizationUserId = null
    profile.value = null
    loading.value = false
    updating.value = false
    error.value = null
  }

  function activateUser(userId: string): number {
    if (activeUserId !== userId) {
      ++stateVersion
      activeUserId = userId
      profile.value = null
      loading.value = false
      updating.value = false
      error.value = null
    }

    return stateVersion
  }

  function isCurrentState(userId: string, currentStateVersion: number): boolean {
    return activeUserId === userId && stateVersion === currentStateVersion
  }

  function getProfileOperationErrorMessage(caughtError: unknown): string {
    if (caughtError instanceof FirebaseError && caughtError.code.startsWith('auth/')) {
      return getAuthErrorMessage(caughtError)
    }

    return getProfileErrorMessage(caughtError)
  }

  return {
    profile,
    loading,
    updating,
    error,
    synchronize,
    reload,
    update,
    updateStatus,
    reset,
  }
})
