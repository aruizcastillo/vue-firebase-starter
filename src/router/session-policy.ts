import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router'

import type { UserAccountStatus } from '@/types/profile.types'

export interface SessionPolicyState {
  authenticated: boolean
  accountStatus: UserAccountStatus | null
}

export function getSessionRedirect(to: RouteLocationNormalized, state: SessionPolicyState): RouteLocationRaw | undefined {
  if (!state.authenticated) {
    if (!to.meta.requiresAuth) return

    if (to.name === 'home') return { name: 'welcome' }

    return {
      name: 'login',
      query: { redirect: to.fullPath },
    }
  }

  const restrictedAccount = state.accountStatus === 'deactivated' || state.accountStatus === 'suspended'

  if (restrictedAccount && !to.meta.allowRestrictedAccount) {
    return { name: 'account-deactivated' }
  }

  if (state.accountStatus === 'active' && to.meta.allowRestrictedAccount) {
    return { name: 'home' }
  }

  if (to.meta.guestOnly) {
    return { name: restrictedAccount ? 'account-deactivated' : 'home' }
  }
}

export function getSafeRedirect(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return null
  return value
}
