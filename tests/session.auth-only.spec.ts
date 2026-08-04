import type { User } from 'firebase/auth'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const authMocks = vi.hoisted(() => ({
  checkPasswordAgainstPolicy: vi.fn(),
  loginWithEmail: vi.fn(),
  loginWithGoogle: vi.fn(),
  logout: vi.fn(),
  observeAuthState: vi.fn(),
  reloadAuthenticatedUser: vi.fn(),
  registerWithEmail: vi.fn(),
  resetPassword: vi.fn(),
  updateAuthenticatedUserDisplayName: vi.fn(),
}))

const profileMocks = vi.hoisted(() => ({
  observeUserProfile: vi.fn(),
  ensureUserProfile: vi.fn(),
  getUserProfile: vi.fn(),
  setUserAccountStatus: vi.fn(),
}))

vi.mock('@/config/auth.config', () => ({
  authConfig: {
    requiresProfile: false,
    requiresAccountStatus: false,
  },
}))
vi.mock('@/services/auth.service', () => authMocks)
vi.mock('@/services/profile.service', () => profileMocks)

import { useSessionStore } from '@/stores/session.store'

let authStateCallback: (user: User | null) => void

describe('auth-only session store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    setActivePinia(createPinia())
    authMocks.observeAuthState.mockImplementation((callback) => {
      authStateCallback = callback
      return vi.fn()
    })
  })

  it('is ready after Firebase Auth resolves without touching a profile', async () => {
    const sessionStore = useSessionStore()
    const resolution = sessionStore.ensureReady()

    authStateCallback(createUser('alice'))

    await expect(resolution).resolves.toBe(true)
    expect(sessionStore.phase).toBe('ready')
    expect(profileMocks.ensureUserProfile).not.toHaveBeenCalled()
    expect(profileMocks.observeUserProfile).not.toHaveBeenCalled()
  })
})

function createUser(uid: string): User {
  return {
    uid,
    email: `${uid}@example.com`,
    displayName: 'Test User',
    photoURL: null,
  } as User
}
