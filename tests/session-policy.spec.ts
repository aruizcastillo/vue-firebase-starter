import type { RouteLocationNormalized } from 'vue-router'
import { describe, expect, it } from 'vitest'

import { getSafeRedirect, getSessionRedirect } from '@/router/session-policy'

describe('session routing policy', () => {
  it.each([
    ['anonymous home', route('home', '/', { requiresAuth: true }), false, null, 'welcome'],
    ['anonymous protected page', route('account-settings', '/account/settings', { requiresAuth: true }), false, null, 'login'],
    ['active guest page', route('login', '/login', { guestOnly: true }), true, 'active', 'home'],
    ['deactivated protected page', route('home', '/', { requiresAuth: true }), true, 'deactivated', 'account-deactivated'],
    ['suspended protected page', route('home', '/', { requiresAuth: true }), true, 'suspended', 'account-deactivated'],
    ['active recovery page', route('account-deactivated', '/account-deactivated', { requiresAuth: true, allowRestrictedAccount: true }), true, 'active', 'home'],
  ])('%s', (_label, to, authenticated, accountStatus, expectedRoute) => {
    const redirect = getSessionRedirect(to, { authenticated, accountStatus }, { requiresAccountStatus: true })
    expect(typeof redirect === 'object' && 'name' in redirect ? redirect.name : null).toBe(expectedRoute)
  })

  it('allows a restricted account to enter its recovery page', () => {
    const redirect = getSessionRedirect(route('account-deactivated', '/account-deactivated', { requiresAuth: true, allowRestrictedAccount: true }), { authenticated: true, accountStatus: 'deactivated' }, { requiresAccountStatus: true })

    expect(redirect).toBeUndefined()
  })

  it.each(['deactivated', 'suspended'] as const)('ignores %s status when account status is disabled', (accountStatus) => {
    const redirect = getSessionRedirect(route('home', '/', { requiresAuth: true }), { authenticated: true, accountStatus }, { requiresAccountStatus: false })

    expect(redirect).toBeUndefined()
  })

  it('does not apply restricted-page policy when account status is disabled', () => {
    const redirect = getSessionRedirect(route('account-deactivated', '/account-deactivated', { requiresAuth: true, allowRestrictedAccount: true }), { authenticated: true, accountStatus: 'active' }, { requiresAccountStatus: false })

    expect(redirect).toBeUndefined()
  })

  it('accepts only internal redirect paths', () => {
    expect(getSafeRedirect('/account/settings')).toBe('/account/settings')
    expect(getSafeRedirect('https://example.com')).toBeNull()
    expect(getSafeRedirect('//example.com')).toBeNull()
  })
})

function route(name: string, fullPath: string, meta: RouteLocationNormalized['meta']): RouteLocationNormalized {
  return {
    name,
    path: fullPath,
    fullPath,
    hash: '',
    query: {},
    params: {},
    matched: [],
    redirectedFrom: undefined,
    meta,
  }
}
