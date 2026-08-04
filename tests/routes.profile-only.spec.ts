import { describe, expect, it, vi } from 'vitest'

vi.mock('@/config/auth.config', () => ({
  authConfig: {
    requiresProfile: true,
    requiresAccountStatus: false,
  },
}))

import { routes } from '@/router/routes'

describe('profile-only routes', () => {
  it('does not register account-status routes', () => {
    expect(routes.some((route) => route.path === '/account-deactivated')).toBe(false)
  })
})
