import type { PasswordValidationStatus } from 'firebase/auth'

const AUTH_EMULATOR_MIN_PASSWORD_LENGTH = 6

export function getEmulatorPasswordValidationStatus(password: string): PasswordValidationStatus {
  const meetsMinPasswordLength = password.length >= AUTH_EMULATOR_MIN_PASSWORD_LENGTH

  return {
    isValid: meetsMinPasswordLength,
    meetsMinPasswordLength,
    passwordPolicy: {
      allowedNonAlphanumericCharacters: '',
      customStrengthOptions: {
        minPasswordLength: AUTH_EMULATOR_MIN_PASSWORD_LENGTH,
      },
      enforcementState: 'ENFORCE',
      forceUpgradeOnSignin: false,
    },
  } as PasswordValidationStatus
}

export function getPasswordPolicyMessage(status: PasswordValidationStatus): string {
  const requirements: string[] = []
  const options = status.passwordPolicy.customStrengthOptions

  if (status.meetsMinPasswordLength === false) {
    requirements.push(`at least ${options.minPasswordLength ?? 6} characters`)
  }

  if (status.meetsMaxPasswordLength === false && options.maxPasswordLength) {
    requirements.push(`no more than ${options.maxPasswordLength} characters`)
  }

  if (status.containsLowercaseLetter === false) {
    requirements.push('a lowercase letter')
  }

  if (status.containsUppercaseLetter === false) {
    requirements.push('an uppercase letter')
  }

  if (status.containsNumericCharacter === false) {
    requirements.push('a number')
  }

  if (status.containsNonAlphanumericCharacter === false) {
    requirements.push('a non-alphanumeric character')
  }

  if (requirements.length === 0) {
    return 'The password does not meet the configured password policy.'
  }

  return `The password must contain ${formatRequirements(requirements)}.`
}

function formatRequirements(requirements: string[]): string {
  if (requirements.length === 1) {
    return requirements[0] ?? ''
  }

  const finalRequirement = requirements.at(-1)

  return `${requirements.slice(0, -1).join(', ')} and ${finalRequirement}`
}
