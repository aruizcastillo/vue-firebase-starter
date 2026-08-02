import { FirebaseError } from 'firebase/app'
import type { PasswordValidationStatus, User, UserCredential } from 'firebase/auth'
import { createPinia, setActivePinia } from 'pinia'
import { isReactive } from 'vue'
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
  ensureUserProfile: vi.fn(),
  setUserAccountStatus: vi.fn(),
  updateUserProfile: vi.fn(),
}))

vi.mock('@/services/auth.service', () => authMocks)
vi.mock('@/services/profile.service', () => profileMocks)

import { useAuthStore } from '@/stores/auth.store'
import { useProfileStore } from '@/stores/profile.store'

type AuthStateCallback = (user: User | null) => void

let authStateCallback: AuthStateCallback

describe('auth store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    setActivePinia(createPinia())

    authMocks.observeAuthState.mockImplementation((callback: AuthStateCallback) => {
      authStateCallback = callback
      return vi.fn()
    })
  })

  it('restores the signed-out state before resolving initialization', async () => {
    const store = useAuthStore()
    const initialization = store.initialize()

    expect(store.authStatus).toBe('restoring')

    authStateCallback(null)
    await initialization

    expect(store.initialized).toBe(true)
    expect(store.authStatus).toBe('unauthenticated')
    expect(store.isAuthenticated).toBe(false)
  })

  it('does not synchronize the profile while restoring authentication', async () => {
    const store = await initializeSignedOutStore()
    const profileStore = useProfileStore()
    const user = createUser('email-user')

    authMocks.loginWithEmail.mockResolvedValue(createCredential(user))

    await expect(store.login(user.email ?? '', 'password')).resolves.toBe(true)

    authStateCallback(user)

    expect(store.isAuthenticated).toBe(true)
    expect(store.error).toBeNull()
    expect(profileStore.profile).toBeNull()
    expect(profileStore.initialized).toBe(false)
    expect(profileMocks.ensureUserProfile).not.toHaveBeenCalled()
  })

  it('keeps the Firebase user outside deep Vue reactivity', async () => {
    const store = await initializeSignedOutStore()
    const user = createUser('opaque-user')

    authMocks.loginWithGoogle.mockResolvedValue(createCredential(user))

    await store.googleLogin()

    expect(store.user).toBe(user)
    expect(isReactive(store.user)).toBe(false)
  })

  it('resets profile state after signing out', async () => {
    const store = await initializeSignedOutStore()
    const profileStore = useProfileStore()
    const user = createUser('stale-user')

    profileMocks.ensureUserProfile.mockResolvedValue(createProfile(user))

    authStateCallback(user)
    await profileStore.synchronize(user)
    authStateCallback(null)

    expect(store.isAuthenticated).toBe(false)
    expect(profileStore.profile).toBeNull()
    expect(profileStore.initialized).toBe(false)
    expect(profileStore.error).toBeNull()
    expect(store.authStatus).toBe('unauthenticated')
  })

  it('returns a neutral success for an unknown password-reset email', async () => {
    const store = await initializeSignedOutStore()

    authMocks.resetPassword.mockRejectedValue(new FirebaseError('auth/user-not-found', 'Unknown user'))

    await expect(store.sendPasswordReset('missing@example.com')).resolves.toBe(true)
    expect(store.error).toBeNull()
  })

  it('returns the password policy reported by Firebase', async () => {
    const store = await initializeSignedOutStore()
    const status = createPasswordStatus()

    authMocks.checkPasswordAgainstPolicy.mockResolvedValue(status)

    await expect(store.validateRegistrationPassword('ValidPassword1!')).resolves.toBe(status)
    expect(store.error).toBeNull()
  })
})

async function initializeSignedOutStore() {
  const store = useAuthStore()
  const initialization = store.initialize()

  authStateCallback(null)
  await initialization

  return store
}

function createUser(uid: string): User {
  return {
    uid,
    email: `${uid}@example.com`,
    displayName: 'Test User',
    photoURL: null,
  } as User
}

function createCredential(user: User): UserCredential {
  return {
    user,
  } as UserCredential
}

function createProfile(user: User) {
  return {
    id: user.uid,
    email: user.email,
    displayName: user.displayName ?? '',
    photoURL: user.photoURL,
    status: 'active' as const,
    createdAt: null,
    updatedAt: null,
  }
}

function createPasswordStatus(): PasswordValidationStatus {
  return {
    isValid: true,
    passwordPolicy: {
      allowedNonAlphanumericCharacters: '!@#',
      customStrengthOptions: {
        minPasswordLength: 8,
      },
      enforcementState: 'ENFORCE',
      forceUpgradeOnSignin: false,
    },
  } as PasswordValidationStatus
}
