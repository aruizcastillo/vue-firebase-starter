import type { PasswordValidationStatus } from 'firebase/auth'
import { describe, expect, it } from 'vitest'

import {
  getEmulatorPasswordValidationStatus,
  getPasswordPolicyMessage,
} from '@/utils/password-policy'

describe('password policy message', () => {
  it('uses the Auth Emulator minimum without requesting its unsupported policy endpoint', () => {
    expect(getEmulatorPasswordValidationStatus('12345')).toMatchObject({
      isValid: false,
      meetsMinPasswordLength: false,
    })
    expect(getEmulatorPasswordValidationStatus('123456')).toMatchObject({
      isValid: true,
      meetsMinPasswordLength: true,
    })
  })

  it('describes every unmet Firebase password requirement', () => {
    const status = {
      isValid: false,
      meetsMinPasswordLength: false,
      containsUppercaseLetter: false,
      containsNumericCharacter: false,
      passwordPolicy: {
        customStrengthOptions: {
          minPasswordLength: 10,
          containsUppercaseLetter: true,
          containsNumericCharacter: true,
        },
      },
    } as PasswordValidationStatus

    expect(getPasswordPolicyMessage(status)).toBe(
      'The password must contain at least 10 characters, an uppercase letter and a number.',
    )
  })
})
