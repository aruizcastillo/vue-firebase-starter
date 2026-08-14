# Data models and persistence

This inventory shows what the starter persists, where it lives, and which
system owns each field. The central rule is simple: authentication identity
belongs to Firebase Auth; Firestore stores only application-owned data.

## Sources of truth

| Source                            | Responsibility                                                 |
| --------------------------------- | -------------------------------------------------------------- |
| Firebase Auth `User`              | Signed-in identity and provider data.                          |
| `src/services/auth.service.ts`    | Operations that modify Auth identity or credentials.           |
| `src/models/profile.model.ts`     | Profile shape and defaults for newly created documents.        |
| `src/services/profile.service.ts` | Reads and writes the private `users/{uid}` Firestore document. |
| `firestore.rules*`                | Exact fields and operations accepted from Firestore clients.   |
| `src/i18n/index.ts`               | Interface-language persistence in browser storage.             |

For Firestore, services describe what the client attempts to write and
Security Rules describe what the backend accepts. They must stay synchronized.

## Firebase Authentication identity

Firebase Authentication is the sole authority for the signed-in user's
identity. Its model is managed by the Firebase SDK rather than duplicated in a
local interface.

| Field           | Type             | Stored and managed by                                         |
| --------------- | ---------------- | ------------------------------------------------------------- |
| `uid`           | `string`         | Firebase Auth; also used as the Firestore document ID.        |
| `email`         | `string \| null` | Firebase Auth and its verified-email flow.                    |
| `displayName`   | `string \| null` | Firebase Auth; editable from account settings.                |
| `photoURL`      | `string \| null` | Firebase Auth/provider. The starter does not edit photos yet. |
| `emailVerified` | `boolean`        | Firebase Auth.                                                |
| `providerData`  | `UserInfo[]`     | Firebase Auth providers, such as password or Google.          |

Firebase also stores password hashes, refresh tokens, and provider credentials.
They are not exposed as application data and must never be copied to Firestore.

Current Auth operations:

| Operation                   | Persisted effect                                                       |
| --------------------------- | ---------------------------------------------------------------------- |
| Email/password registration | Creates an Auth identity and credentials.                              |
| Google login                | Uses identity fields supplied by Google, including any provider photo. |
| Display-name edit           | Updates only Firebase Auth with `updateProfile()`.                     |
| Verified email change       | Updates only Firebase Auth after verification.                         |
| Password change/reset       | Updates credentials managed internally by Firebase Auth.               |

The current SDK user is available as `authStore.user`. Pinia loading and error
fields are runtime state, not persisted models.

## Firestore application profile

Modes with profiles enabled may create one private document per Auth user:

```text
users/{firebaseAuthUid}
```

This is an application profile, not an identity mirror. It intentionally does
not contain `email`, `displayName`, or `photoURL`.

### `profile` mode

```ts
{
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

This metadata-only record is a clean extension point for private fields owned
by a derived application, such as onboarding preferences or an
application-specific username. Add them to `src/models/profile.model.ts` and
their defaults to `createUserProfile()`, then update the matching Rules, tests,
and this document. The service deliberately has no field-level creation logic.

The session does not create, read, or observe this document in profile mode. A
feature calls `profileStore.load(user)` when it needs the profile; that action
creates a missing document, performs a one-time read, and keeps no listener.

### `full` mode

```ts
{
  status: 'active' | 'deactivated' | 'suspended'
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

| Field       | Constraints                                                           |
| ----------- | --------------------------------------------------------------------- |
| Document ID | Must equal the current Firebase Auth UID.                             |
| `status`    | Created as `active`; client transitions are `active` ↔ `deactivated`. |
| `createdAt` | Server timestamp set on creation and immutable to clients.            |
| `updatedAt` | Server timestamp set on creation and every allowed status change.     |

Trusted administrative tooling may set or restore `suspended`; a suspended
document is read-only to the client. Profiles are owner-readable only. Rules
deny collection reads, cross-user access, deletion, arbitrary fields,
subcollections, and every unmatched collection.

The snapshot mapper adds an `id` property derived from the document ID and uses
`status: null` for the metadata-only shape. `id` and `null` status are not stored
fields.

## Persistence by authentication mode

| Mode        | Firebase Auth identity | `users/{uid}` Firestore document                                 |
| ----------- | ---------------------- | ---------------------------------------------------------------- |
| `auth-only` | Always available.      | Not created, read, observed, or writable.                        |
| `profile`   | Always available.      | Private timestamps; created/loaded on demand without a listener. |
| `full`      | Always available.      | Private timestamps + status; listened during session startup.    |

Auth-only rules deny all Firestore access until a derived project explicitly
adds rules for its own business collections.

## Browser storage

The selected interface language is stored in `localStorage`:

```text
key: locale
value: en | es
```

Firebase manages its own Auth persistence internally. The starter does not
write other application models to `localStorage` or `sessionStorage`.

## Runtime-only models

These values are not persisted application records:

- `AuthStatus` and Auth operation state;
- `SessionPhase` and readiness promises;
- `ProfileConnectionState` and listener errors;
- Formisch/Valibot form input, schemas, and validation errors;
- route-policy state and redirects.

## Maintenance checklist

When changing persisted data:

1. Update `src/models/profile.model.ts` (shape and creation defaults).
2. Update every applicable Firestore rule variant with exact validation.
3. Add emulator tests for ownership, types, required fields, schema pollution,
   timestamp manipulation, and update bypasses.
4. Update this inventory and the authentication architecture documentation.
