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
  ensureUserProfile: vi.fn(),
  getUserProfile: vi.fn(),
  observeUserProfile: vi.fn(),
  setUserAccountStatus: vi.fn(),
}))

vi.mock('@/config/auth.config', () => ({
  authConfig: {
    requiresProfile: true,
    requiresAccountStatus: false,
  },
}))
vi.mock('@/services/auth.service', () => authMocks)
vi.mock('@/services/profile.service', () => profileMocks)

import { useSessionStore } from '@/stores/session.store'
import { useProfileStore } from '@/stores/profile.store'

let authStateCallback: (user: User | null) => void

describe('profile-mode session store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    setActivePinia(createPinia())
    authMocks.observeAuthState.mockImplementation((callback) => {
      authStateCallback = callback
      return vi.fn()
    })
  })

  it('is ready after Auth resolves without loading or observing a profile', async () => {
    const sessionStore = useSessionStore()
    const resolution = sessionStore.ensureReady()

    authStateCallback({ uid: 'alice' } as User)

    await expect(resolution).resolves.toBe(true)
    expect(sessionStore.phase).toBe('ready')
    expect(profileMocks.ensureUserProfile).not.toHaveBeenCalled()
    expect(profileMocks.getUserProfile).not.toHaveBeenCalled()
    expect(profileMocks.observeUserProfile).not.toHaveBeenCalled()
  })

  it('keeps the ready session usable when an on-demand profile load fails', async () => {
    const user = { uid: 'alice' } as User
    const sessionStore = useSessionStore()
    const resolution = sessionStore.ensureReady()
    authStateCallback(user)
    await resolution
    profileMocks.ensureUserProfile.mockRejectedValue(new Error('Firestore unavailable'))

    await expect(useProfileStore().load(user)).resolves.toBe(false)

    expect(sessionStore.phase).toBe('ready')
    expect(sessionStore.error).toBeNull()
  })
})
