import { afterEach, describe, expect, it, vi } from 'vitest'

describe('profile model', () => {
  afterEach(() => {
    vi.doUnmock('@/config/auth.config')
    vi.resetModules()
  })

  it('creates timestamp metadata in profile mode', async () => {
    const { createUserProfile } = await loadProfileModel(false)

    expect(createUserProfile()).toMatchObject({
      createdAt: expect.anything(),
      updatedAt: expect.anything(),
    })
    expect(createUserProfile()).not.toHaveProperty('status')
  })

  it('includes the initial account status in full mode', async () => {
    const { createUserProfile } = await loadProfileModel(true)

    expect(createUserProfile()).toMatchObject({
      status: 'active',
      createdAt: expect.anything(),
      updatedAt: expect.anything(),
    })
  })
})

async function loadProfileModel(requiresAccountStatus: boolean) {
  vi.doMock('@/config/auth.config', () => ({
    authConfig: { requiresAccountStatus },
  }))

  return import('@/models/profile.model')
}
