import { FirebaseError } from 'firebase/app'
import type { User } from 'firebase/auth'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const profileMocks = vi.hoisted(() => ({
  ensureUserProfile: vi.fn(),
  setUserAccountStatus: vi.fn(),
  updateUserProfile: vi.fn(),
}))

vi.mock('@/services/profile.service', () => profileMocks)

import { useProfileStore } from '@/stores/profile.store'

describe('profile store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    setActivePinia(createPinia())
  })

  it('synchronizes the active user profile', async () => {
    const store = useProfileStore()
    const user = createUser('alice')
    const profile = createProfile(user)

    profileMocks.ensureUserProfile.mockResolvedValue(profile)

    await expect(store.synchronize(user)).resolves.toBe(true)

    expect(store.profile).toEqual(profile)
    expect(store.loading).toBe(false)
    expect(store.initialized).toBe(true)
    expect(store.error).toBeNull()
  })

  it('does not synchronize an initialized profile again for the same user', async () => {
    const store = useProfileStore()
    const user = createUser('alice')
    profileMocks.ensureUserProfile.mockResolvedValue(createProfile(user))

    await store.synchronize(user)
    await store.synchronize(user)

    expect(profileMocks.ensureUserProfile).toHaveBeenCalledTimes(1)
  })

  it('marks the initial profile load as resolved after an error', async () => {
    const store = useProfileStore()
    const user = createUser('alice')
    profileMocks.ensureUserProfile.mockRejectedValue(new Error('Firestore unavailable'))

    await expect(store.synchronize(user)).resolves.toBe(false)

    expect(store.initialized).toBe(true)
    expect(store.loading).toBe(false)
    expect(store.error).toBe('The operation could not be completed.')
  })

  it('deduplicates concurrent synchronization for the same user', async () => {
    const store = useProfileStore()
    const user = createUser('alice')
    const deferredProfile = createDeferred<ReturnType<typeof createProfile>>()

    profileMocks.ensureUserProfile.mockReturnValue(deferredProfile.promise)

    const firstSynchronization = store.synchronize(user)
    const secondSynchronization = store.synchronize(user)

    expect(profileMocks.ensureUserProfile).toHaveBeenCalledTimes(1)

    deferredProfile.resolve(createProfile(user))

    await expect(Promise.all([firstSynchronization, secondSynchronization])).resolves.toEqual([true, true])
  })

  it('ignores synchronization results after reset', async () => {
    const store = useProfileStore()
    const user = createUser('alice')
    const deferredProfile = createDeferred<ReturnType<typeof createProfile>>()

    profileMocks.ensureUserProfile.mockReturnValue(deferredProfile.promise)

    const synchronization = store.synchronize(user)

    store.reset()
    deferredProfile.resolve(createProfile(user))
    await synchronization

    expect(store.profile).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.initialized).toBe(false)
    expect(store.error).toBeNull()
  })

  it('keeps the new user profile when an old synchronization finishes later', async () => {
    const store = useProfileStore()
    const alice = createUser('alice')
    const bob = createUser('bob')
    const deferredAliceProfile = createDeferred<ReturnType<typeof createProfile>>()

    profileMocks.ensureUserProfile.mockReturnValueOnce(deferredAliceProfile.promise).mockResolvedValueOnce(createProfile(bob))

    const aliceSynchronization = store.synchronize(alice)
    await store.synchronize(bob)

    deferredAliceProfile.resolve(createProfile(alice))
    await aliceSynchronization

    expect(store.profile?.id).toBe('bob')
  })

  it('updates the profile and reconciles it again in the background', async () => {
    const store = useProfileStore()
    const user = createUser('alice')

    profileMocks.ensureUserProfile.mockResolvedValueOnce(createProfile(user)).mockResolvedValueOnce({
      ...createProfile(user),
      displayName: 'Updated name',
    })
    profileMocks.updateUserProfile.mockResolvedValue(undefined)

    await store.synchronize(user)
    await expect(store.update(user, '  Updated name  ')).resolves.toBe(true)

    expect(profileMocks.updateUserProfile).toHaveBeenCalledWith(user, {
      displayName: 'Updated name',
    })

    await vi.waitFor(() => {
      expect(store.profile?.displayName).toBe('Updated name')
      expect(store.loading).toBe(false)
    })
  })

  it('does not restore profile state when an update finishes after reset', async () => {
    const store = useProfileStore()
    const user = createUser('alice')
    const deferredUpdate = createDeferred<void>()

    profileMocks.ensureUserProfile.mockResolvedValue(createProfile(user))
    profileMocks.updateUserProfile.mockReturnValue(deferredUpdate.promise)

    await store.synchronize(user)
    const update = store.update(user, 'Updated name')

    store.reset()
    deferredUpdate.resolve()
    await update

    expect(store.profile).toBeNull()
    expect(store.error).toBeNull()
    expect(store.updating).toBe(false)
    expect(profileMocks.ensureUserProfile).toHaveBeenCalledTimes(1)
  })

  it('maps Firebase Auth failures raised while updating the profile', async () => {
    const store = useProfileStore()
    const user = createUser('alice')

    profileMocks.updateUserProfile.mockRejectedValue(new FirebaseError('auth/network-request-failed', 'Network unavailable'))

    await expect(store.update(user, 'Alice')).resolves.toBe(false)

    expect(store.error).toBe('Could not connect to the authentication service.')
    expect(store.updating).toBe(false)
  })

  it('updates the account status without changing profile identity fields', async () => {
    const store = useProfileStore()
    const user = createUser('alice')
    profileMocks.ensureUserProfile.mockResolvedValue(createProfile(user))
    profileMocks.setUserAccountStatus.mockResolvedValue(undefined)

    await store.synchronize(user)
    await expect(store.updateStatus(user, 'deactivated')).resolves.toBe(true)

    expect(profileMocks.setUserAccountStatus).toHaveBeenCalledWith('alice', 'deactivated')
    expect(store.profile?.status).toBe('deactivated')
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

function createDeferred<T>() {
  let resolve!: (value: T) => void

  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve
  })

  return {
    promise,
    resolve,
  }
}
