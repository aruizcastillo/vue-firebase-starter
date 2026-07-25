export interface AuthCredentials {
  email: string
  password: string
}

export interface RegisterCredentials extends AuthCredentials {
  confirmPassword: string
}

export type AuthStatus =
  'idle' | 'restoring' | 'unauthenticated' | 'authenticating' | 'authenticated' | 'signing-out'
