import { describe, expect, it } from 'vitest'

import { authConfig, authMode } from '@/config/auth.config'

describe('authentication configuration', () => {
  it('uses auth-only mode by default', () => {
    expect(authMode).toBe('auth-only')
    expect(authConfig).toEqual({
      requiresProfile: false,
      requiresAccountStatus: false,
    })
  })
})
