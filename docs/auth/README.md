# Authentication and session architecture

This document describes ownership, startup coordination, routing, optional
Firestore features, and account-management flows. For exact persisted fields,
see [Data models and persistence](../data-models/README.md).

## Responsibility boundaries

The architecture deliberately keeps identity and application data separate:

```text
Firebase Auth User
  -> uid, email, displayName, photoURL, providers, verification

Optional users/{uid} Firestore document
  -> application metadata
  -> account status (full mode only)
```

- The Auth observer is the source of truth for the current Firebase user.
- `authStore.user` is the source used by navigation, greetings, and account
  identity forms.
- Firestore never mirrors `email`, `displayName`, or `photoURL`.
- Firestore document reads are the source of truth for optional application
  profile data; the full-mode listener is the source of truth for status.
- Router policy improves client behavior; Firestore Security Rules enforce data
  access.

Firebase `User` is an opaque SDK object stored in a `shallowRef` and marked raw.
After SDK methods mutate it in place, the Auth store triggers that ref so Vue
consumers see the new display name or verified email.

## Authentication modes

`src/config/auth.config.ts` exposes one selector, `authMode`, and derives valid
feature flags from it.

| Mode        | Auth identity | Firestore `users/{uid}` | Account-status routing |
| ----------- | ------------- | ----------------------- | ---------------------- |
| `auth-only` | Yes           | No                      | No                     |
| `profile`   | Yes           | Timestamps only         | No                     |
| `full`      | Yes           | Timestamps + status     | Yes                    |

Auth-only is the repository default. Profile mode is intentionally a minimal
base for derived projects that will add private application-specific user
fields. Full mode opts into account status and its session dependency.

Identity UI works in all three modes. Selecting auth-only does not remove the
Auth user's email, display name, or provider photo; it only disables the
starter Firestore profile capability.

## Auth store

The Auth store owns one `onAuthStateChanged` subscription and these states:

```ts
type AuthStatus = 'idle' | 'restoring' | 'unauthenticated' | 'authenticating' | 'authenticated' | 'signing-out'
```

`initialize()` is idempotent and shares one promise while startup is pending.
Login and logout wait for the Auth observer to publish the expected UID instead
of assigning `user` directly. This keeps external changes and local operations
on the same state path.

Auth operations include registration, email/password login, Google login,
logout, password reset/policy validation, display-name update, and explicit
user reload after a verified email change. Operation failures are mapped to
safe localized messages.

## Firestore profile store

Profiles are enabled in `profile` and `full` modes, but they have different
lifecycle requirements.

In profile mode, a feature explicitly calls `profileStore.load(user)`. That
operation:

1. runs a transaction against `users/{uid}`;
2. creates the document with server timestamps if it does not exist;
3. does nothing if it already exists;
4. performs a one-time read and stores the result;
5. opens no listener and does not affect session readiness.

In full mode, session startup calls `profileStore.connect(user)`. It ensures the
document exists, attaches one document listener, and resolves only after the
first valid snapshot provides `status`. The listener remains active so status
changes can affect an open application immediately.

There is no identity reconciliation because identity is not duplicated.
Existing documents are not rewritten during session restoration.

The store deduplicates concurrent operations for one UID, clears data when the
UID changes, disconnects any active listener, and ignores stale operation
generations. One-time profile errors remain local to the requesting feature;
required full-mode connection errors fail session readiness.

In profile mode the stored model is:

```ts
{
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

In full mode it is:

```ts
{
  status: 'active' | 'deactivated' | 'suspended'
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

The client model maps absent status to `null`; this is expected only in profile
mode. Legacy identity-mirroring schemas and migrations are intentionally not
supported.

## Account status

Status participates in routing and account UI only in full mode.

| Status        | Client behavior                                  | Recovery                              |
| ------------- | ------------------------------------------------ | ------------------------------------- |
| `active`      | Normal access.                                   | Not applicable.                       |
| `deactivated` | Restricted screen with reactivation and logout.  | Owner may change it back to `active`. |
| `suspended`   | Restricted screen without a reactivation action. | Trusted administration only.          |

The client creates only `active`, can transition `active` to `deactivated` and
back, and can never write `suspended`. Suspended documents are client-read-only.
Admin SDK and Console operations bypass client rules and must be protected by
the project's administrative controls.

The starter uses status for restricted-account routing, but a derived project
owns the final product policy. Future business-collection rules do not inherit
that policy automatically. If inactive accounts should lose backend data
access, those rules should explicitly require an active profile; client routing
is only user-experience behavior.

## Session coordination

The Session store is the application-level readiness state machine:

```ts
type SessionPhase = 'idle' | 'restoring-auth' | 'loading-profile' | 'ready' | 'error'
```

`ensureReady()`:

- restores Auth once;
- considers a signed-out session ready without touching Firestore;
- considers authenticated auth-only and profile sessions ready as soon as Auth
  resolves;
- in full mode, connects `users/{uid}` and waits for its first snapshot;
- shares one promise across concurrent guards and components;
- fails closed if required startup state cannot be restored.

The profile is loaded once for full-mode session startup, not once per
navigation. Normal route changes reuse the ready session and do not reload,
reconcile, or open another listener. Auth-only performs no profile access;
profile mode accesses Firestore only when a feature explicitly requests it.

The store watches UID changes synchronously. A change invalidates old readiness,
disconnects the previous profile, clears cached data, and resolves the new
identity. Auth observer errors always fail the session; profile listener errors
fail it only in full mode, where status is required.

`retry()` starts a fresh readiness lifecycle after an error. It does not force
normal navigation to reload session data.

## Router integration

Every navigation awaits `sessionStore.ensureReady()` and then applies the pure
policy in `session-policy.ts`.

| Session and destination                           | Result                            |
| ------------------------------------------------- | --------------------------------- |
| Signed out, home                                  | Welcome.                          |
| Signed out, protected route                       | Login with a safe local redirect. |
| Signed in, guest-only route                       | Home.                             |
| Restricted full-mode account, normal route        | Restricted-account page.          |
| Active full-mode account, restricted-account page | Home.                             |

If readiness fails, navigation uses the neutral `session-error` route and
preserves the intended local destination. Protocol-relative and external
redirects are rejected.

Reconciliation watchers reapply policy after an external Auth change, a
full-mode realtime status change, or a required listener failure. Local
login/logout actions retain control of their intended destination.

## Global feedback overlay

`App.vue` keeps `RouterView` mounted. While session restoration blocks safe
interaction, its route container becomes `inert` and
`SessionFeedbackOverlay.vue` renders above it.

The overlay is required for:

- Auth restoration in every mode;
- the first full-mode profile snapshot required to obtain status;
- retry/logout recovery from session errors.

It is not activated by normal navigation after readiness. Consequently, no
special adaptation is needed merely because identity now comes from Auth.
Auth-only and profile startup skip the `loading-profile` phase naturally. The
generic phase name remains appropriate because status is part of the private
application profile and the document may gain other session-relevant fields.

## Account-management flows

### Display name

The personal-information form is available in all modes. It calls Firebase Auth
`updateProfile()` only, then refreshes the shallow Auth ref. No Firestore write
or synchronization is involved. An empty display name is allowed.

### Photo URL

The UI may display the `photoURL` supplied by Firebase Auth or an identity
provider. The starter does not currently provide photo upload/edit management.

### Verified email change

Password users reauthenticate with their current password; Google users use a
popup. Firebase sends a verification link to the new address. After completion,
the page reloads the Auth user and refreshes its ID token. No Firestore
reconciliation occurs.

### Password change

Password users reauthenticate, validate the new value against Firebase's
password policy, and update their Auth credential. Provider-only users do not
see the password-change form.

### Deactivation and reactivation

Available only in full mode. Deactivation updates Firestore status and signs
out. A later login observes the same status and routes to the restricted page.
Reactivation updates status to `active`; suspended accounts never render that
action.

## Firestore rule variants

| Mode      | Rule file                 | Firebase config         | Deployment command                     |
| --------- | ------------------------- | ----------------------- | -------------------------------------- |
| Full      | `firestore.rules.full`    | `firebase.full.json`    | `pnpm firebase:deploy:rules:full`      |
| Profile   | `firestore.rules.profile` | `firebase.profile.json` | `pnpm firebase:deploy:rules:profile`   |
| Auth only | `firestore.rules`         | `firebase.json`         | `pnpm firebase:deploy:rules:auth-only` |

Full rules accept the exact timestamp/status schema and protected status
transitions. Profile rules accept only the exact timestamp schema and expose no
client update operation. Auth-only rules default-deny every Firestore path.

`firebase.json`, `pnpm firebase:deploy:rules`, and
`pnpm firebase:emulators` follow the auth-only repository default. Named
profile/full commands select their corresponding Firebase configuration.

Deploy the client build and matching rule variant together. A derived project
must deliberately add and test every business collection in each mode that
should expose it.

## Invariants

- At most one active Auth observer.
- Exactly one profile listener for the resolved UID in full mode.
- No profile access in auth-only mode or while signed out.
- No automatic profile access or session dependency in profile mode.
- Auth is the sole source for email, display name, and photo URL.
- Firestore profile snapshots are the sole source for application status.
- Normal navigation does not reload Auth or Firestore state.
- Stale listener callbacks cannot mutate the current profile.
- Required startup errors block protected interaction until retry or logout.
- Client routing never substitutes for Firestore Security Rules.

## Test coverage

- `tests/auth.store.spec.ts`: observer lifecycle, Auth operations, and opaque
  user refreshes;
- `tests/profile.store.spec.ts`: document creation, listener ownership,
  concurrency, stale callbacks, and status mutations;
- `tests/session.store.spec.ts`, `tests/session.profile.spec.ts`, and
  `tests/session.auth-only.spec.ts`: readiness across all three modes;
- `tests/session-policy.spec.ts` and `tests/router.reconciliation.spec.ts`:
  redirect policy and external changes;
- `tests/app.session-feedback.spec.ts`: mounted routes, overlay, retry, logout;
- `tests/firestore*.rules.spec.ts`: exact schemas, ownership, timestamps,
  state transitions, and default denial.
