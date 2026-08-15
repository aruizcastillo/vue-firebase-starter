import 'vue-router'

export type DocumentMetaKey =
  | 'metadata.default.title'
  | 'metadata.default.description'
  | 'metadata.home.title'
  | 'metadata.home.description'
  | 'metadata.accountSettings.title'
  | 'metadata.accountSettings.description'
  | 'metadata.accountDeactivated.title'
  | 'metadata.accountDeactivated.description'
  | 'metadata.sessionError.title'
  | 'metadata.sessionError.description'
  | 'metadata.welcome.title'
  | 'metadata.welcome.description'
  | 'metadata.login.title'
  | 'metadata.login.description'
  | 'metadata.register.title'
  | 'metadata.register.description'
  | 'metadata.forgotPassword.title'
  | 'metadata.forgotPassword.description'
  | 'metadata.notFound.title'
  | 'metadata.notFound.description'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    guestOnly?: boolean
    allowRestrictedAccount?: boolean
    title?: DocumentMetaKey
    description?: DocumentMetaKey
  }
}
