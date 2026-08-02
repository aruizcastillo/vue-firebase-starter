import type { Router } from 'vue-router'

import { useAuthStore } from '@/stores/auth.store'
import { useProfileStore } from '@/stores/profile.store'

export function registerRouterGuards(router: Router): void {
  router.beforeEach(async (to) => {
    const authStore = useAuthStore()

    await authStore.initialize()
    const profileStore = useProfileStore()

    if (!authStore.user) {
      profileStore.reset()

      if (!to.meta.requiresAuth) {
        return
      }

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

    if (!profileStore.initialized) {
      await profileStore.synchronize(authStore.user)
    }

    if (profileStore.profile?.status === 'deactivated') {
      await authStore.signOut()
      return { name: 'login' }
    }

    if (profileStore.profile?.status === 'suspended' && !to.meta.allowDeactivated) {
      return { name: 'account-deactivated' }
    }

    if (profileStore.profile?.status === 'active' && to.meta.allowDeactivated) {
      return { name: 'home' }
    }

    if (to.meta.guestOnly) {
      return {
        name: profileStore.profile?.status === 'suspended' ? 'account-deactivated' : 'home',
      }
    }
  })
}
