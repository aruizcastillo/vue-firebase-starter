import * as v from 'valibot'

export function createProfileSettingsSchema(nameTooLongMessage: string) {
  return v.object({
    displayName: v.pipe(v.string(), v.trim(), v.maxLength(80, nameTooLongMessage)),
  })
}
