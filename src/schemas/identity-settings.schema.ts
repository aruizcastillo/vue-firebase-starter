import * as v from 'valibot'

export function createIdentitySettingsSchema(nameTooLongMessage: string, nameUnchangedMessage: string, getCurrentDisplayName: () => string | null | undefined) {
  return v.object({
    displayName: v.pipe(
      v.string(),
      v.trim(),
      v.maxLength(80, nameTooLongMessage),
      v.check((displayName) => displayName === '' || displayName !== getCurrentDisplayName()?.trim(), nameUnchangedMessage),
    ),
  })
}
