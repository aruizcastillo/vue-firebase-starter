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
  authConfig: { requiresProfile: true, requiresAccountStatus: true },
}))
vi.mock('@/services/auth.service', () => authMocks)
vi.mock('@/services/profile.service', () => profileMocks)

import { useAuthStore } from '@/stores/auth.store'
import { useProfileStore } from '@/stores/profile.store'
import { useSessionStore } from '@/stores/session.store'
import type { UserProfile } from '@/types/profile.types'

type AuthStateCallback = (user: User | null) => void
type AuthErrorCallback = (error: Error) => void

interface ProfileListener {
  next: (profile: UserProfile | null) => void
  error: (error: Error) => void
  unsubscribe: ReturnType<typeof vi.fn>
}

let authStateCallback: AuthStateCallback
let authErrorCallback: AuthErrorCallback
let profileListeners: ProfileListener[]

describe('session store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    setActivePinia(createPinia())
    profileListeners = []

    authMocks.observeAuthState.mockImplementation((callback: AuthStateCallback, errorCallback: AuthErrorCallback) => {
      authStateCallback = callback
      authErrorCallback = errorCallback
      return vi.fn()
    })
    profileMocks.ensureUserProfile.mockResolvedValue(undefined)
    profileMocks.observeUserProfile.mockImplementation((_userId, next, error) => {
      const listener = { next, error, unsubscribe: vi.fn() }
      profileListeners.push(listener)
      return listener.unsubscribe
    })
  })

  it('considers an anonymous session ready without a profile', async () => {
    const sessionStore = useSessionStore()
    const resolution = sessionStore.ensureReady()

    expect(sessionStore.phase).toBe('restoring-auth')
    authStateCallback(null)

    await expect(resolution).resolves.toBe(true)
    expect(sessionStore.phase).toBe('ready')
    expect(sessionStore.isReady).toBe(true)
    expect(profileMocks.ensureUserProfile).not.toHaveBeenCalled()
  })

  it('waits for the authenticated user profile snapshot', async () => {
    const sessionStore = useSessionStore()
    const user = createUser('alice')
    const resolution = sessionStore.ensureReady()

    authStateCallback(user)
    await waitForProfileListener(0)

    expect(sessionStore.phase).toBe('loading-profile')
    profileListeners[0]!.next(createProfile(user))

    await expect(resolution).resolves.toBe(true)
    expect(sessionStore.phase).toBe('ready')
    expect(sessionStore.error).toBeNull()
  })

  it('deduplicates concurrent session resolution', async () => {
    const sessionStore = useSessionStore()
    const user = createUser('alice')
    const firstResolution = sessionStore.ensureReady()
    const secondResolution = sessionStore.ensureReady()

    authStateCallback(user)
    await waitForProfileListener(0)
    profileListeners[0]!.next(createProfile(user))

    await expect(Promise.all([firstResolution, secondResolution])).resolves.toEqual([true, true])
    expect(authMocks.observeAuthState).toHaveBeenCalledTimes(1)
    expect(profileMocks.observeUserProfile).toHaveBeenCalledTimes(1)
  })

  it('fails closed when the initial profile connection fails', async () => {
    const sessionStore = useSessionStore()
    const user = createUser('alice')
    profileMocks.ensureUserProfile.mockRejectedValue(new Error('Firestore unavailable'))
    const resolution = sessionStore.ensureReady()

    authStateCallback(user)

    await expect(resolution).resolves.toBe(false)
    expect(sessionStore.phase).toBe('error')
    expect(sessionStore.error).toBe('The operation could not be completed.')
  })

  it('disconnects the old profile and resolves a new user', async () => {
    const sessionStore = useSessionStore()
    const authStore = useAuthStore()
    const alice = createUser('alice')
    const bob = createUser('bob')
    const initialResolution = sessionStore.ensureReady()

    authStateCallback(alice)
    await waitForProfileListener(0)
    profileListeners[0]!.next(createProfile(alice))
    await initialResolution

    authStateCallback(bob)
    await waitForProfileListener(1)
    const bobResolution = sessionStore.ensureReady()
    profileListeners[1]!.next(createProfile(bob))

    await expect(bobResolution).resolves.toBe(true)
    expect(authStore.user?.uid).toBe('bob')
    expect(useProfileStore().profile?.id).toBe('bob')
    expect(profileListeners[0]!.unsubscribe).toHaveBeenCalledOnce()
  })

  it('moves the session to error if the active listener later fails', async () => {
    const sessionStore = useSessionStore()
    const user = createUser('alice')
    const resolution = sessionStore.ensureReady()

    authStateCallback(user)
    await waitForProfileListener(0)
    profileListeners[0]!.next(createProfile(user))
    await resolution
    profileListeners[0]!.error(new Error('Listener failed'))

    expect(sessionStore.phase).toBe('error')
    expect(sessionStore.isBlocking).toBe(true)
  })

  it('preserves an Auth observer error while the profile is connecting', async () => {
    const sessionStore = useSessionStore()
    const user = createUser('alice')
    const resolution = sessionStore.ensureReady()

    authStateCallback(user)
    await waitForProfileListener(0)
    authErrorCallback(new Error('Auth observer failed'))

    await expect(resolution).resolves.toBe(false)
    expect(sessionStore.phase).toBe('error')
    expect(sessionStore.error).toBe('An unexpected error occurred.')
  })

  it('retries a failed profile connection', async () => {
    const sessionStore = useSessionStore()
    const user = createUser('alice')
    profileMocks.ensureUserProfile.mockRejectedValueOnce(new Error('Temporary failure')).mockResolvedValueOnce(undefined)
    const initialResolution = sessionStore.ensureReady()

    authStateCallback(user)
    await expect(initialResolution).resolves.toBe(false)

    const retry = sessionStore.retry()
    await waitForProfileListener(0)
    profileListeners[0]!.next(createProfile(user))

    await expect(retry).resolves.toBe(true)
    expect(sessionStore.phase).toBe('ready')
  })
})

async function waitForProfileListener(index: number): Promise<void> {
  await vi.waitFor(() => expect(profileListeners[index]).toBeDefined())
}

function createUser(uid: string): User {
  return {
    uid,
    email: `${uid}@example.com`,
    displayName: 'Test User',
    photoURL: null,
  } as User
}

function createProfile(user: User): UserProfile {
  return {
    id: user.uid,
    status: 'active',
    createdAt: null,
    updatedAt: null,
  }
}
