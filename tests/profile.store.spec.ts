import { FirebaseError } from 'firebase/app'
import type { User } from 'firebase/auth'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const profileMocks = vi.hoisted(() => ({
  ensureUserProfile: vi.fn(),
  getUserProfile: vi.fn(),
  observeUserProfile: vi.fn(),
  setUserAccountStatus: vi.fn(),
}))

vi.mock('@/services/profile.service', () => profileMocks)
vi.mock('@/config/auth.config', () => ({
  authConfig: { requiresProfile: true, requiresAccountStatus: true },
}))

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
    profileMocks.ensureUserProfile.mockResolvedValue(undefined)
    profileMocks.getUserProfile.mockImplementation(async (userId) => createProfile(userId))
    profileMocks.observeUserProfile.mockImplementation((_userId, next, error) => {
      const listener = { next, error, unsubscribe: vi.fn() }
      listeners.push(listener)
      return listener.unsubscribe
    })
  })

  it('loads and creates a profile on demand without opening a listener', async () => {
    const store = useProfileStore()

    await expect(store.load(createUser('alice'))).resolves.toBe(true)

    expect(profileMocks.ensureUserProfile).toHaveBeenCalledWith('alice')
    expect(profileMocks.getUserProfile).toHaveBeenCalledWith('alice')
    expect(profileMocks.observeUserProfile).not.toHaveBeenCalled()
    expect(store.profile).toEqual(createProfile('alice'))
  })

  it('ensures the document and resolves after the first snapshot', async () => {
    const store = useProfileStore()
    const connection = store.connect(createUser('alice'))

    expect(store.state).toBe('connecting')
    await waitForListener(0)
    listeners[0]!.next(createProfile('alice'))

    await expect(connection).resolves.toBe(true)
    expect(profileMocks.ensureUserProfile).toHaveBeenCalledWith('alice')
    expect(store.profile).toEqual(createProfile('alice'))
    expect(store.state).toBe('ready')
  })

  it('deduplicates concurrent connections for the same user', async () => {
    const store = useProfileStore()
    const user = createUser('alice')
    const first = store.connect(user)
    const second = store.connect(user)

    await waitForListener(0)
    expect(profileMocks.ensureUserProfile).toHaveBeenCalledTimes(1)
    expect(profileMocks.observeUserProfile).toHaveBeenCalledTimes(1)
    listeners[0]!.next(createProfile('alice'))
    await expect(Promise.all([first, second])).resolves.toEqual([true, true])
  })

  it('exposes document creation failures as connection errors', async () => {
    const store = useProfileStore()
    profileMocks.ensureUserProfile.mockRejectedValue(new Error('Firestore unavailable'))

    await expect(store.connect(createUser('alice'))).resolves.toBe(false)
    expect(store.profile).toBeNull()
    expect(store.state).toBe('error')
  })

  it('fails closed when full mode receives a document without status', async () => {
    const store = useProfileStore()
    const connection = store.connect(createUser('alice'))
    await waitForListener(0)
    listeners[0]!.next({ ...createProfile('alice'), status: null })

    await expect(connection).resolves.toBe(false)
    expect(store.state).toBe('error')
    expect(store.profile).toBeNull()
  })

  it('updates application data from later snapshots', async () => {
    const store = useProfileStore()
    await connectStore(store, createUser('alice'))
    listeners[0]!.next({ ...createProfile('alice'), status: 'deactivated' })
    expect(store.profile?.status).toBe('deactivated')
  })

  it('moves a ready connection to error if its listener fails', async () => {
    const store = useProfileStore()
    await connectStore(store, createUser('alice'))
    listeners[0]!.error(new FirebaseError('unavailable', 'Offline'))
    expect(store.profile).toBeNull()
    expect(store.state).toBe('error')
  })

  it('unsubscribes and settles a pending connection on disconnect', async () => {
    const store = useProfileStore()
    const connection = store.connect(createUser('alice'))
    await waitForListener(0)
    store.disconnect()
    await expect(connection).resolves.toBe(false)
    expect(listeners[0]!.unsubscribe).toHaveBeenCalledOnce()
  })

  it('ignores stale callbacks after switching users', async () => {
    const store = useProfileStore()
    const aliceConnection = store.connect(createUser('alice'))
    await waitForListener(0)
    const bobConnection = store.connect(createUser('bob'))
    await waitForListener(1)

    listeners[0]!.next(createProfile('alice'))
    listeners[1]!.next(createProfile('bob'))

    await expect(aliceConnection).resolves.toBe(false)
    await expect(bobConnection).resolves.toBe(true)
    expect(store.profile?.id).toBe('bob')
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
  listeners.at(-1)!.next(createProfile(user.uid))
  await connection
}

async function waitForListener(index: number): Promise<void> {
  await vi.waitFor(() => expect(listeners[index]).toBeDefined())
}

function createUser(uid: string): User {
  return { uid } as User
}

function createProfile(id: string): UserProfile {
  return { id, status: 'active', createdAt: null, updatedAt: null }
}
