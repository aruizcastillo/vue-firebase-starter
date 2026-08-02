import * as v from 'valibot'
import { describe, expect, it } from 'vitest'

import { createProfileSettingsSchema } from '@/schemas/profile-settings.schema'

describe('profile settings schema', () => {
  const schema = createProfileSettingsSchema('Name is too long.', 'Enter a different name.', () => 'Alex')

  it('allows an empty display name', () => {
    expect(v.safeParse(schema, { displayName: '   ' })).toMatchObject({
      success: true,
      output: { displayName: '' },
    })
  })

  it('rejects the current display name after trimming', () => {
    expect(v.safeParse(schema, { displayName: ' Alex ' })).toMatchObject({
      success: false,
      issues: [expect.objectContaining({ message: 'Enter a different name.' })],
    })
  })
})
