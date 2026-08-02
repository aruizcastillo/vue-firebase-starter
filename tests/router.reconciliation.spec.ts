import type { User } from 'firebase/auth'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const authMocks = vi.hoisted(() => ({
  checkPasswordAgainstPolicy: vi.fn(),
  loginWithEmail: vi.fn(),
  loginWithGoogle: vi.fn(),
  logout: vi.fn(),
  observeAuthState: vi.fn(),
  registerWithEmail: vi.fn(),
  resetPassword: vi.fn(),
}))

const profileMocks = vi.hoisted(() => ({
  observeUserProfile: vi.fn(),
  reconcileUserProfile: vi.fn(),
  setUserAccountStatus: vi.fn(),
  updateUserProfile: vi.fn(),
}))

vi.mock('@/services/auth.service', () => authMocks)
vi.mock('@/services/profile.service', () => profileMocks)

import { registerSessionReconciliation } from '@/router/guards'
import { useSessionStore } from '@/stores/session.store'
import type { UserProfile } from '@/types/profile.types'

let authStateCallback: (user: User | null) => void
let profileNext: (profile: UserProfile | null) => void
let profileError: (error: Error) => void

describe('external session reconciliation', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    authMocks.observeAuthState.mockImplementation((callback) => {
      authStateCallback = callback
      return vi.fn()
    })
    profileMocks.reconcileUserProfile.mockResolvedValue(undefined)
    profileMocks.observeUserProfile.mockImplementation((_userId, next, error) => {
      profileNext = next
      profileError = error
      return vi.fn()
    })
  })

  it('redirects a protected route after an external sign out', async () => {
    const { pinia, router, user } = await createActiveApplication()
    registerSessionReconciliation(router, pinia)

    authStateCallback(null)

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('welcome'))
    expect(useSessionStore(pinia).isReady).toBe(true)
    expect(user.uid).toBe('alice')
  })

  it('redirects immediately when an active account becomes suspended', async () => {
    const { pinia, router, user } = await createActiveApplication()
    registerSessionReconciliation(router, pinia)

    profileNext({ ...createProfile(user), status: 'suspended' })

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('account-deactivated'))
  })

  it('moves to session recovery if the realtime listener fails', async () => {
    const { pinia, router } = await createActiveApplication()
    registerSessionReconciliation(router, pinia)

    profileError(new Error('Listener failed'))

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('session-error'))
    expect(router.currentRoute.value.query.redirect).toBe('/')
    expect(useSessionStore(pinia).phase).toBe('error')
  })
})

async function createActiveApplication() {
  const pinia = createPinia()
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', meta: { requiresAuth: true }, component: { template: '<p>Home</p>' } },
      { path: '/welcome', name: 'welcome', component: { template: '<p>Welcome</p>' } },
      { path: '/login', name: 'login', component: { template: '<p>Login</p>' } },
      {
        path: '/account-deactivated',
        name: 'account-deactivated',
        meta: { requiresAuth: true, allowRestrictedAccount: true },
        component: { template: '<p>Restricted</p>' },
      },
      { path: '/session-error', name: 'session-error', component: { template: '<p>Error</p>' } },
    ],
  })
  const sessionStore = useSessionStore(pinia)
  const user = createUser('alice')
  const resolution = sessionStore.ensureReady()

  authStateCallback(user)
  await vi.waitFor(() => expect(profileMocks.observeUserProfile).toHaveBeenCalledOnce())
  profileNext(createProfile(user))
  await resolution
  await router.push('/')

  return { pinia, router, user }
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
    email: user.email,
    displayName: user.displayName ?? '',
    photoURL: user.photoURL,
    status: 'active',
    createdAt: null,
    updatedAt: null,
  }
}
