import type { Router } from 'vue-router'

import { useAuthStore } from '@/stores/auth.store'
import { useProfileStore } from '@/stores/profile.store'

export function registerRouterGuards(router: Router): void {
  router.beforeEach(async (to) => {
    const authStore = useAuthStore()

    await authStore.initialize()
    const profileStore = useProfileStore()

    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
      if (to.name === 'home') {
        return {
          name: 'welcome',
        }
      }

      return {
        name: 'login',
        query: {
          redirect: to.fullPath,
        },
      }
    }

    if (authStore.isAuthenticated && authStore.user) {
      await profileStore.synchronize(authStore.user)

      if (profileStore.profile?.status !== 'active' && !to.meta.allowDeactivated) {
        return { name: 'account-deactivated' }
      }

      if (profileStore.profile?.status === 'active' && to.meta.allowDeactivated) {
        return { name: 'home' }
      }
    }

    if (to.meta.guestOnly && authStore.isAuthenticated) {
      return {
        name: profileStore.profile?.status !== 'active' ? 'account-deactivated' : 'home',
      }
    }
  })
}
