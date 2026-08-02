import { watch } from 'vue'
import type { Pinia } from 'pinia'
import type { RouteLocationNormalized, RouteLocationRaw, Router } from 'vue-router'

import { getSafeRedirect, getSessionRedirect } from '@/router/session-policy'
import { useAuthStore } from '@/stores/auth.store'
import { useProfileStore } from '@/stores/profile.store'
import { useSessionStore } from '@/stores/session.store'

function getPolicyRedirect(to: RouteLocationNormalized, authStore: ReturnType<typeof useAuthStore>, profileStore: ReturnType<typeof useProfileStore>): RouteLocationRaw | undefined {
  return getSessionRedirect(to, {
    authenticated: authStore.user !== null,
    accountStatus: profileStore.profile?.status ?? null,
  })
}

function getSessionErrorRedirect(to: RouteLocationNormalized): RouteLocationRaw {
  return {
    name: 'session-error',
    query: { redirect: to.fullPath },
  }
}

export function registerRouterGuards(router: Router, pinia: Pinia): void {
  router.beforeEach(async (to) => {
    const authStore = useAuthStore(pinia)
    const profileStore = useProfileStore(pinia)
    const sessionStore = useSessionStore(pinia)
    const sessionReady = await sessionStore.ensureReady()

    if (!sessionReady) {
      return to.name === 'session-error' ? undefined : getSessionErrorRedirect(to)
    }

    if (to.name === 'session-error') {
      return getSafeRedirect(to.query.redirect) ?? (authStore.user ? { name: 'home' } : { name: 'welcome' })
    }

    return getPolicyRedirect(to, authStore, profileStore)
  })
}

export function registerSessionReconciliation(router: Router, pinia: Pinia): void {
  const authStore = useAuthStore(pinia)
  const profileStore = useProfileStore(pinia)
  const sessionStore = useSessionStore(pinia)

  watch(
    () => authStore.user?.uid ?? null,
    async (userId, previousUserId) => {
      if (userId === previousUserId) return

      const localTransition = authStore.localTransition
      const sessionReady = await sessionStore.ensureReady()

      if (localTransition || !router.currentRoute.value.name) return

      const currentRoute = router.currentRoute.value
      const redirect = sessionReady ? getPolicyRedirect(currentRoute, authStore, profileStore) : getSessionErrorRedirect(currentRoute)

      if (redirect) await router.replace(redirect)
    },
    { flush: 'sync' },
  )

  watch(
    () => profileStore.profile?.status ?? null,
    async (accountStatus, previousAccountStatus) => {
      if (!accountStatus || !previousAccountStatus || accountStatus === previousAccountStatus || !router.currentRoute.value.name) return

      const redirect = getPolicyRedirect(router.currentRoute.value, authStore, profileStore)
      if (redirect) await router.replace(redirect)
    },
  )

  watch(
    () => profileStore.connectionState,
    async (connectionState, previousConnectionState) => {
      if (connectionState !== 'error' || previousConnectionState !== 'ready' || !router.currentRoute.value.name) return

      const currentRoute = router.currentRoute.value
      if (currentRoute.name !== 'session-error') {
        await router.replace(getSessionErrorRedirect(currentRoute))
      }
    },
  )
}
