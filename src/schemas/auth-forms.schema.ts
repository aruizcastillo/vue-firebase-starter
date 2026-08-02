import * as v from 'valibot'

type EmailValidationMessages = {
  emailRequired: string
  invalidEmail: string
}

function createEmailSchema(messages: EmailValidationMessages) {
  return v.pipe(v.string(), v.trim(), v.nonEmpty(messages.emailRequired), v.email(messages.invalidEmail))
}

export function createLoginSchema(messages: EmailValidationMessages & { passwordRequired: string }) {
  return v.object({
    email: createEmailSchema(messages),
    password: v.pipe(v.string(), v.nonEmpty(messages.passwordRequired)),
  })
}

export function createRegistrationSchema(messages: EmailValidationMessages & { passwordRequired: string; passwordsDoNotMatch: string }) {
  return v.pipe(
    v.object({
      email: createEmailSchema(messages),
      password: v.pipe(v.string(), v.nonEmpty(messages.passwordRequired)),
      confirmPassword: v.pipe(v.string(), v.nonEmpty(messages.passwordsDoNotMatch)),
    }),
    v.forward(
      v.partialCheck([['password'], ['confirmPassword']], (input) => input.password === input.confirmPassword, messages.passwordsDoNotMatch),
      ['confirmPassword'],
    ),
  )
}

export function createPasswordResetSchema(messages: EmailValidationMessages) {
  return v.object({
    email: createEmailSchema(messages),
  })
}

export function createEmailChangeSchema(messages: EmailValidationMessages & { currentPasswordRequired: string; newEmailUnchanged: string }, currentEmail: string | null, requiresCurrentPassword: boolean) {
  return v.object({
    newEmail: v.pipe(
      createEmailSchema(messages),
      v.check((email) => email !== currentEmail, messages.newEmailUnchanged),
    ),
    currentPassword: requiresCurrentPassword ? v.pipe(v.string(), v.nonEmpty(messages.currentPasswordRequired)) : v.optional(v.string()),
  })
}

export function createPasswordChangeSchema(messages: { passwordRequired: string; passwordsDoNotMatch: string; newPasswordUnchanged: string }) {
  return v.pipe(
    v.object({
      passwordCurrent: v.pipe(v.string(), v.nonEmpty(messages.passwordRequired)),
      passwordNew: v.pipe(v.string(), v.nonEmpty(messages.passwordRequired)),
      passwordConfirmation: v.pipe(v.string(), v.nonEmpty(messages.passwordsDoNotMatch)),
    }),
    v.forward(
      v.partialCheck([['passwordNew'], ['passwordConfirmation']], (input) => input.passwordNew === input.passwordConfirmation, messages.passwordsDoNotMatch),
      ['passwordConfirmation'],
    ),
    v.forward(
      v.partialCheck([['passwordCurrent'], ['passwordNew']], (input) => input.passwordCurrent !== input.passwordNew, messages.newPasswordUnchanged),
      ['passwordNew'],
    ),
  )
}
