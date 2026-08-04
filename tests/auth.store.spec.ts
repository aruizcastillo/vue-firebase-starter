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
  reloadAuthenticatedUser: vi.fn(),
  registerWithEmail: vi.fn(),
  resetPassword: vi.fn(),
  updateAuthenticatedUserDisplayName: vi.fn(),
}))

vi.mock('@/services/auth.service', () => authMocks)

import { useAuthStore } from '@/stores/auth.store'

type AuthStateCallback = (user: User | null) => void
type AuthErrorCallback = (error: Error) => void

let authStateCallback: AuthStateCallback
let authErrorCallback: AuthErrorCallback

describe('auth store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    setActivePinia(createPinia())

    authMocks.observeAuthState.mockImplementation((callback: AuthStateCallback, errorCallback: AuthErrorCallback) => {
      authStateCallback = callback
      authErrorCallback = errorCallback
      return vi.fn()
    })
  })

  it('restores the signed-out state with one observer', async () => {
    const store = useAuthStore()
    const firstInitialization = store.initialize()
    const secondInitialization = store.initialize()

    expect(store.authStatus).toBe('restoring')
    expect(authMocks.observeAuthState).toHaveBeenCalledTimes(1)

    authStateCallback(null)
    await Promise.all([firstInitialization, secondInitialization])

    expect(store.initialized).toBe(true)
    expect(store.authStatus).toBe('unauthenticated')
    expect(store.isAuthenticated).toBe(false)
  })

  it('reports observer errors and allows initialization to retry', async () => {
    const store = useAuthStore()
    const initialization = store.initialize()
    const error = new FirebaseError('auth/network-request-failed', 'Offline')
    const firstUnsubscribe = authMocks.observeAuthState.mock.results[0]?.value

    authErrorCallback(error)

    await expect(initialization).rejects.toBe(error)
    expect(firstUnsubscribe).toHaveBeenCalledOnce()
    expect(store.initialized).toBe(false)
    expect(store.observerError).toBe('Could not connect to the authentication service.')

    const retry = store.initialize()
    expect(authMocks.observeAuthState).toHaveBeenCalledTimes(2)
    authStateCallback(null)
    await retry
  })

  it('tracks a local authentication transition without profile coupling', async () => {
    const store = await initializeSignedOutStore()
    const user = createUser('email-user')
    const credential = createDeferred<UserCredential>()
    authMocks.loginWithEmail.mockReturnValue(credential.promise)

    const login = store.login(user.email ?? '', 'password')

    expect(store.localTransition).toBe(true)
    expect(store.authStatus).toBe('authenticating')

    credential.resolve(createCredential(user))
    await Promise.resolve()

    expect(store.user).toBeNull()
    expect(store.localTransition).toBe(true)

    authStateCallback(user)
    await expect(login).resolves.toBe(true)

    expect(store.localTransition).toBe(false)
    expect(store.user).toBe(user)
    expect(store.authStatus).toBe('authenticated')
  })

  it('uses the observer as the source for an opaque Firebase user', async () => {
    const store = await initializeSignedOutStore()
    const user = createUser('opaque-user')
    authMocks.loginWithGoogle.mockResolvedValue(createCredential(user))

    const login = store.googleLogin()
    authStateCallback(user)
    await login

    expect(store.user).toBe(user)
    expect(isReactive(store.user)).toBe(false)
  })

  it('clears the current user after a local sign out', async () => {
    const store = await initializeSignedOutStore()
    const user = createUser('signed-in-user')
    authMocks.loginWithEmail.mockResolvedValue(createCredential(user))
    authMocks.logout.mockResolvedValue(undefined)

    const login = store.login(user.email ?? '', 'password')
    authStateCallback(user)
    await login

    const signOut = store.signOut()
    authStateCallback(null)
    await expect(signOut).resolves.toBe(true)

    expect(store.user).toBeNull()
    expect(store.localTransition).toBe(false)
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

  it('updates the Auth display name without a Firestore dependency', async () => {
    const store = useAuthStore()
    const initialization = store.initialize()
    const user = createUser('alice')
    authStateCallback(user)
    await initialization
    authMocks.updateAuthenticatedUserDisplayName.mockImplementation(async (currentUser: User, displayName: string) => {
      Object.assign(currentUser, { displayName })
    })

    await expect(store.updateDisplayName('  Updated name  ')).resolves.toBe(true)

    expect(authMocks.updateAuthenticatedUserDisplayName).toHaveBeenCalledWith(user, 'Updated name')
    expect(store.user?.displayName).toBe('Updated name')
    expect(store.identityUpdating).toBe(false)
  })

  it('reloads the Auth user and exposes the refreshed opaque object', async () => {
    const store = useAuthStore()
    const initialization = store.initialize()
    const user = createUser('alice')
    authStateCallback(user)
    await initialization
    authMocks.reloadAuthenticatedUser.mockImplementation(async (currentUser: User) => {
      Object.assign(currentUser, { email: 'updated@example.com' })
    })

    await expect(store.refreshUser()).resolves.toBe(true)
    expect(store.user?.email).toBe('updated@example.com')
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
  return { user } as UserCredential
}

function createPasswordStatus(): PasswordValidationStatus {
  return {
    isValid: true,
    passwordPolicy: {
      allowedNonAlphanumericCharacters: '!@#',
      customStrengthOptions: { minPasswordLength: 8 },
      enforcementState: 'ENFORCE',
      forceUpgradeOnSignin: false,
    },
  } as PasswordValidationStatus
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve
  })
  return { promise, resolve }
}
