import type { Router } from 'vue-router'

import { useAuthStore } from '@/stores/auth.store'

export function registerRouterGuards(router: Router): void {
  router.beforeEach(async (to) => {
    const authStore = useAuthStore()

    await authStore.initialize()

    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
      return {
        name: 'login',
        query: {
          redirect: to.fullPath,
        },
      }
    }

    if (to.meta.guestOnly && authStore.isAuthenticated) {
      return {
        name: 'home',
      }
    }
  })
}
