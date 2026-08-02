import { FirebaseError } from 'firebase/app'
import type { User } from 'firebase/auth'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const profileMocks = vi.hoisted(() => ({
  observeUserProfile: vi.fn(),
  reconcileUserProfile: vi.fn(),
  setUserAccountStatus: vi.fn(),
  updateUserProfile: vi.fn(),
}))

vi.mock('@/services/profile.service', () => profileMocks)

import { useProfileStore } from '@/stores/profile.store'
import type { UserProfile } from '@/types/profile.types'

interface ProfileListener {
  next: (profile: UserProfile | null) => void
  error: (error: Error) => void
  unsubscribe: ReturnType<typeof vi.fn>
}

let listeners: ProfileListener[]

describe('profile store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    setActivePinia(createPinia())
    listeners = []
    profileMocks.reconcileUserProfile.mockResolvedValue(undefined)
    profileMocks.observeUserProfile.mockImplementation((_userId, next, error) => {
      const listener = { next, error, unsubscribe: vi.fn() }
      listeners.push(listener)
      return listener.unsubscribe
    })
  })

  it('reconciles and resolves after the first realtime snapshot', async () => {
    const store = useProfileStore()
    const user = createUser('alice')
    const connection = store.connect(user)

    expect(store.connectionState).toBe('connecting')
    await waitForListener(0)
    listeners[0]!.next(createProfile(user))

    await expect(connection).resolves.toBe(true)
    expect(store.profile).toEqual(createProfile(user))
    expect(store.connectionState).toBe('ready')
    expect(store.connectionError).toBeNull()
  })

  it('deduplicates concurrent connections for the same user', async () => {
    const store = useProfileStore()
    const user = createUser('alice')
    const firstConnection = store.connect(user)
    const secondConnection = store.connect(user)

    await waitForListener(0)
    expect(profileMocks.reconcileUserProfile).toHaveBeenCalledTimes(1)
    expect(profileMocks.observeUserProfile).toHaveBeenCalledTimes(1)

    listeners[0]!.next(createProfile(user))
    await expect(Promise.all([firstConnection, secondConnection])).resolves.toEqual([true, true])
  })

  it('exposes reconciliation failures as connection errors', async () => {
    const store = useProfileStore()
    const user = createUser('alice')
    profileMocks.reconcileUserProfile.mockRejectedValue(new Error('Firestore unavailable'))

    await expect(store.connect(user)).resolves.toBe(false)

    expect(store.profile).toBeNull()
    expect(store.connectionState).toBe('error')
    expect(store.connectionError).toBe('The operation could not be completed.')
  })

  it('updates the profile from later snapshots', async () => {
    const store = useProfileStore()
    const user = createUser('alice')
    await connectStore(store, user)

    listeners[0]!.next({ ...createProfile(user), displayName: 'Updated externally' })

    expect(store.profile?.displayName).toBe('Updated externally')
  })

  it('moves a ready connection to error if its listener fails', async () => {
    const store = useProfileStore()
    const user = createUser('alice')
    await connectStore(store, user)

    listeners[0]!.error(new FirebaseError('unavailable', 'Offline'))

    expect(store.profile).toBeNull()
    expect(store.connectionState).toBe('error')
    expect(store.connectionError).toBe('The service is temporarily unavailable.')
  })

  it('unsubscribes and settles a pending connection on disconnect', async () => {
    const store = useProfileStore()
    const user = createUser('alice')
    const connection = store.connect(user)
    await waitForListener(0)

    store.disconnect()

    await expect(connection).resolves.toBe(false)
    expect(listeners[0]!.unsubscribe).toHaveBeenCalledOnce()
    expect(store.connectionState).toBe('idle')
  })

  it('ignores stale callbacks after switching users', async () => {
    const store = useProfileStore()
    const alice = createUser('alice')
    const bob = createUser('bob')
    const aliceConnection = store.connect(alice)
    await waitForListener(0)

    const bobConnection = store.connect(bob)
    await waitForListener(1)
    listeners[0]!.next(createProfile(alice))
    listeners[1]!.next(createProfile(bob))

    await expect(aliceConnection).resolves.toBe(false)
    await expect(bobConnection).resolves.toBe(true)
    expect(store.profile?.id).toBe('bob')
    expect(listeners[0]!.unsubscribe).toHaveBeenCalledOnce()
  })

  it('updates a connected profile without reconnecting', async () => {
    const store = useProfileStore()
    const user = createUser('alice')
    profileMocks.updateUserProfile.mockResolvedValue(undefined)
    await connectStore(store, user)

    await expect(store.update(user, '  Updated name  ')).resolves.toBe(true)

    expect(profileMocks.updateUserProfile).toHaveBeenCalledWith(user, { displayName: 'Updated name' })
    expect(profileMocks.reconcileUserProfile).toHaveBeenCalledTimes(1)
    expect(profileMocks.observeUserProfile).toHaveBeenCalledTimes(1)
  })

  it('maps operation errors independently from connection errors', async () => {
    const store = useProfileStore()
    const user = createUser('alice')
    await connectStore(store, user)
    profileMocks.updateUserProfile.mockRejectedValue(new FirebaseError('auth/network-request-failed', 'Offline'))

    await expect(store.update(user, 'Alice')).resolves.toBe(false)

    expect(store.connectionState).toBe('ready')
    expect(store.connectionError).toBeNull()
    expect(store.operationError).toBe('Could not connect to the authentication service.')
  })

  it('updates account status through the active connection', async () => {
    const store = useProfileStore()
    const user = createUser('alice')
    profileMocks.setUserAccountStatus.mockResolvedValue(undefined)
    await connectStore(store, user)

    await expect(store.updateStatus(user, 'deactivated')).resolves.toBe(true)

    expect(profileMocks.setUserAccountStatus).toHaveBeenCalledWith('alice', 'deactivated')
  })
})

async function connectStore(store: ReturnType<typeof useProfileStore>, user: User): Promise<void> {
  const connection = store.connect(user)
  await waitForListener(listeners.length)
  listeners.at(-1)!.next(createProfile(user))
  await connection
}

async function waitForListener(index: number): Promise<void> {
  await vi.waitFor(() => expect(listeners[index]).toBeDefined())
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
