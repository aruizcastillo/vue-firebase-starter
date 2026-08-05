import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

import { authConfig } from '@/config/auth.config'
import { useAuthStore } from '@/stores/auth.store'
import { useProfileStore } from '@/stores/profile.store'
import type { SessionPhase } from '@/types/session.types'

const unresolvedUser = Symbol('unresolved-user')

export const useSessionStore = defineStore('session', () => {
  const authStore = useAuthStore()
  const profileStore = useProfileStore()

  const phase = ref<SessionPhase>('idle')
  const error = ref<string | null>(null)

  let resolvedUserId: string | null | typeof unresolvedUser = unresolvedUser
  let resolutionPromise: Promise<boolean> | null = null

  const isBusy = computed(() => phase.value === 'restoring-auth' || phase.value === 'loading-profile')
  const isReady = computed(() => phase.value === 'ready')
  const isBlocking = computed(() => isBusy.value || phase.value === 'error')

  watch(
    () => authStore.user?.uid ?? null,
    (userId, previousUserId) => {
      if (userId === previousUserId) return

      resolvedUserId = unresolvedUser
      if (authConfig.requiresProfile) profileStore.disconnect()

      if (authStore.initialized) {
        void resolveCurrentSession()
      }
    },
    { flush: 'sync' },
  )

  if (authConfig.requiresAccountStatus) {
    watch(
      () => profileStore.state,
      (state) => {
        if (state !== 'error' || !authStore.user) return

        phase.value = 'error'
        error.value = profileStore.error
      },
      { flush: 'sync' },
    )
  }

  watch(
    () => authStore.observerError,
    (observerError) => {
      if (!observerError) return

      resolvedUserId = unresolvedUser
      if (authConfig.requiresProfile) profileStore.disconnect()
      phase.value = 'error'
      error.value = observerError
    },
    { flush: 'sync' },
  )

  function ensureReady(): Promise<boolean> {
    const currentUserId = authStore.user?.uid ?? null

    if (authStore.initialized && resolvedUserId === currentUserId) {
      if (phase.value === 'ready') return Promise.resolve(true)
      if (phase.value === 'error') return Promise.resolve(false)
    }

    return resolveCurrentSession()
  }

  function resolveCurrentSession(): Promise<boolean> {
    if (resolutionPromise) return resolutionPromise

    const activeResolution = performResolution()
    resolutionPromise = activeResolution

    void activeResolution.finally(() => {
      if (resolutionPromise === activeResolution) {
        resolutionPromise = null
      }
    })

    return activeResolution
  }

  async function performResolution(): Promise<boolean> {
    try {
      if (!authStore.initialized) {
        phase.value = 'restoring-auth'
        error.value = null
        await authStore.initialize()
      }

      while (true) {
        const currentUser = authStore.user

        if (!currentUser) {
          if (authConfig.requiresProfile) profileStore.disconnect()
          resolvedUserId = null
          phase.value = 'ready'
          error.value = null
          return true
        }

        if (!authConfig.requiresAccountStatus) {
          resolvedUserId = currentUser.uid
          phase.value = 'ready'
          error.value = null
          return true
        }

        phase.value = 'loading-profile'
        error.value = null

        const succeeded = await profileStore.connect(currentUser)

        if (!authStore.initialized || authStore.observerError) {
          resolvedUserId = unresolvedUser
          phase.value = 'error'
          error.value = authStore.observerError ?? authStore.operationError
          return false
        }

        if (authStore.user?.uid !== currentUser.uid) continue

        resolvedUserId = currentUser.uid

        if (!succeeded) {
          phase.value = 'error'
          error.value = profileStore.error
          return false
        }

        phase.value = 'ready'
        error.value = null
        return true
      }
    } catch {
      resolvedUserId = unresolvedUser
      phase.value = 'error'
      error.value = authStore.observerError ?? authStore.operationError
      return false
    }
  }

  function retry(): Promise<boolean> {
    resolvedUserId = unresolvedUser
    if (authConfig.requiresProfile) profileStore.disconnect()
    phase.value = 'idle'
    error.value = null

    return resolveCurrentSession()
  }

  return {
    phase,
    error,
    isBusy,
    isReady,
    isBlocking,
    ensureReady,
    retry,
  }
})
