export type AuthMode = 'auth-only' | 'profile' | 'full'

// Change this value to select the starter architecture.
//
// 'auth-only' (default) — Firebase Auth identity, without a starter Firestore document.
// Recommended when authentication is enough or the app defines its own data model.
// Deploy with: pnpm firebase:deploy:rules:auth-only
//
// 'profile' — Firebase Auth identity + a metadata-only Firestore document.
// Recommended when the app will extend users/{uid} with private application data.
// Deploy with: pnpm firebase:deploy:rules:profile
//
// 'full' — Firebase Auth identity + metadata + account status.
// Recommended when users can be deactivated or suspended.
// Deploy with: pnpm firebase:deploy:rules:full
export const authMode = 'auth-only' satisfies AuthMode

type AuthConfigByMode = {
  'auth-only': {
    requiresProfile: false
    requiresAccountStatus: false
  }
  profile: {
    requiresProfile: true
    requiresAccountStatus: false
  }
  full: {
    requiresProfile: true
    requiresAccountStatus: true
  }
}

export type AuthConfig = AuthConfigByMode[AuthMode]

const authConfigs = {
  'auth-only': {
    requiresProfile: false,
    requiresAccountStatus: false,
  },
  profile: {
    requiresProfile: true,
    requiresAccountStatus: false,
  },
  full: {
    requiresProfile: true,
    requiresAccountStatus: true,
  },
} satisfies AuthConfigByMode

export const authConfig = authConfigs[authMode]
