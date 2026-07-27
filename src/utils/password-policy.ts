import type { PasswordValidationStatus } from 'firebase/auth'
import { i18n } from '@/i18n'

const AUTH_EMULATOR_MIN_PASSWORD_LENGTH = 6

export function getEmulatorPasswordValidationStatus(password: string): PasswordValidationStatus {
  const meetsMinPasswordLength = password.length >= AUTH_EMULATOR_MIN_PASSWORD_LENGTH
  return {
    isValid: meetsMinPasswordLength,
    meetsMinPasswordLength,
    passwordPolicy: {
      allowedNonAlphanumericCharacters: '',
      customStrengthOptions: { minPasswordLength: AUTH_EMULATOR_MIN_PASSWORD_LENGTH },
      enforcementState: 'ENFORCE',
      forceUpgradeOnSignin: false,
    },
  } as PasswordValidationStatus
}

export function getPasswordPolicyMessage(status: PasswordValidationStatus): string {
  const requirements: string[] = []
  const options = status.passwordPolicy.customStrengthOptions
  if (status.meetsMinPasswordLength === false)
    requirements.push(
      i18n.global.t('auth.passwordPolicy.minimum', { count: options.minPasswordLength ?? 6 }),
    )
  if (status.meetsMaxPasswordLength === false && options.maxPasswordLength)
    requirements.push(
      i18n.global.t('auth.passwordPolicy.maximum', { count: options.maxPasswordLength }),
    )
  if (status.containsLowercaseLetter === false)
    requirements.push(i18n.global.t('auth.passwordPolicy.lowercase'))
  if (status.containsUppercaseLetter === false)
    requirements.push(i18n.global.t('auth.passwordPolicy.uppercase'))
  if (status.containsNumericCharacter === false)
    requirements.push(i18n.global.t('auth.passwordPolicy.number'))
  if (status.containsNonAlphanumericCharacter === false)
    requirements.push(i18n.global.t('auth.passwordPolicy.symbol'))
  if (requirements.length === 0) return i18n.global.t('auth.passwordPolicy.invalid')
  return i18n.global.t('auth.passwordPolicy.mustContain', {
    requirements: formatRequirements(requirements),
  })
}

function formatRequirements(requirements: string[]): string {
  if (requirements.length === 1) return requirements[0] ?? ''
  const finalRequirement = requirements.at(-1)
  return `${requirements.slice(0, -1).join(', ')} ${i18n.global.t('auth.passwordPolicy.and')} ${finalRequirement}`
}
