# Authentication, session, and user profile

This document describes the internal authentication lifecycle of the starter.
It covers Firebase Authentication, the Firestore user profile, session
coordination, route policy, and global loading/error feedback.

## Responsibilities

| Layer                        | Responsibility                                                 |
| ---------------------------- | -------------------------------------------------------------- |
| `auth.service.ts`            | Calls the Firebase Authentication SDK.                         |
| `auth.store.ts`              | Owns the observed Firebase user and authentication operations. |
| `profile.service.ts`         | Reconciles, observes, and mutates `users/{uid}`.               |
| `profile.store.ts`           | Owns one realtime profile connection for the current UID.      |
| `session.store.ts`           | Coordinates Auth restoration and initial profile readiness.    |
| `session-policy.ts`          | Applies the pure account-access redirect policy.               |
| `guards.ts`                  | Waits for session readiness and performs redirects.            |
| `SessionFeedbackOverlay.vue` | Displays blocking startup and session-error feedback.          |

Firebase Authentication is the identity source. Firestore Security Rules are
the authorization boundary for profile data. Router guards improve navigation
and user experience, but they are not a security boundary.

## Startup lifecycle

`main.ts` creates Pinia before registering the router guards and session
reconciliation watchers. The application then mounts without waiting for
Firebase manually.

The first navigation follows this sequence:

```text
router guard
  -> sessionStore.ensureReady()
  -> authStore.initialize()
  -> first onAuthStateChanged callback
      -> no user: session is ready
      -> authenticated user: profileStore.connect(user)
          -> reconcile users/{uid}
          -> attach onSnapshot
          -> first valid profile snapshot
          -> session is ready
  -> apply route redirect policy
```

Concurrent calls to `ensureReady()` share the same resolution promise. Normal
navigations after readiness do not reconnect Auth or reload the profile.

## Firebase Authentication

### State

The Auth store exposes:

```ts
type AuthStatus = 'idle' | 'restoring' | 'unauthenticated' | 'authenticating' | 'authenticated' | 'signing-out'
```

Its relevant state is:

- `user`: the current opaque Firebase `User`, stored in a `shallowRef` and
  marked raw to prevent Vue from traversing SDK internals;
- `initialized`: whether the observer has emitted its first state;
- `observerError`: failure of the Auth observer;
- `error`: authentication-operation feedback;
- `localTransition`: distinguishes a login/logout initiated by this tab from an
  external Auth change;
- `operationLoading`: loading state for non-session operations such as password
  reset and password-policy validation.

### Observer ownership

`onAuthStateChanged` is the only source that writes the current user. Login and
registration credentials are not copied directly into the store. Instead, the
operation waits until the observer emits the expected UID. Sign-out similarly
waits until the observer emits `null`.

`initialize()` deduplicates concurrent callers and creates at most one active
Auth observer. If that observer fails, the store:

1. records the observer error;
2. marks Auth as unresolved;
3. cancels the failed subscription;
4. rejects pending observer-state waiters;
5. allows a later initialization attempt to create a replacement observer.

This keeps Firebase Auth changes from other tabs or windows authoritative.

### Supported operations

The service/store pair supports:

- email/password registration and login;
- Google popup login;
- logout;
- password reset with a neutral response for unknown addresses;
- Firebase password-policy validation;
- password change after password reauthentication;
- verified email change after password or Google reauthentication.

The Auth Emulator does not implement Firebase's password-policy endpoint. In
emulator mode, registration uses the emulator-compatible fallback policy.

## Firestore user profile

### Document model

Each Firebase user owns one private document:

```text
users/{firebaseAuthUid}
```

```ts
interface UserProfile {
  id: string
  email: string | null
  displayName: string
  photoURL: string | null
  status: 'active' | 'deactivated' | 'suspended'
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}
```

The UID is encoded in the document path and is not stored as a profile field.
Identity fields mirror Firebase Auth. Profile and Auth writes are separate
Firebase operations and cannot be one atomic transaction across both services.
Reconciliation repairs an incomplete identity update on a later retry or
session restoration.

### Connection state

```ts
type ProfileConnectionState = 'idle' | 'connecting' | 'ready' | 'error'
```

The Profile store separates:

- `connectionError`: failure to establish or maintain the realtime profile;
- `operationError`: failure of a profile mutation or reconciliation requested
  by a page;
- `updating`: pending profile mutation;
- `loading`: compatibility computed value for the initial connection only.

Connection errors affect session availability. Operation errors remain local
to the feature that initiated the mutation and do not hide the application.

### Connecting a user

`connect(user)` owns the complete lifecycle for one UID:

1. Return immediately if that UID already has a ready profile.
2. Share the existing promise if the same UID is connecting.
3. Disconnect any previous UID.
4. Reconcile or create `users/{uid}` in a Firestore transaction.
5. Attach one `onSnapshot` listener to the document.
6. Resolve the initial connection only after the first existing, valid
   snapshot.

New documents are created with identity fields from Firebase Auth, status
`active`, and server timestamps. Existing active documents update their
identity fields only when needed. Deactivated and suspended profiles are not
silently reactivated or identity-reconciled during connection.

A connection generation counter identifies the current UID lifecycle. Every
callback verifies both UID and generation, so delayed callbacks from an old
listener cannot replace the current profile or error state.

`disconnect()` unsubscribes the listener, invalidates pending callbacks,
resolves an unfinished initial connection as unsuccessful, and clears all
profile state. It runs when the user signs out or the UID changes.

### Realtime behavior and mutations

After readiness, `onSnapshot` remains attached:

- later snapshots replace the current profile;
- status changes made by an administrator or another tab are reflected without
  navigation reads;
- a listener error moves the profile connection to `error` and clears the
  profile.

Display-name and status mutations do not reload the document. The listener
reflects local and server-confirmed writes. This avoids redundant reads and
keeps one source for profile state.

`reconcile(user)` is also available for explicit identity synchronization, such
as after a verified email change. It reports an operation error without opening
another listener.

## Account status

| Status        | Client behavior                                         | Allowed recovery                                 |
| ------------- | ------------------------------------------------------- | ------------------------------------------------ |
| `active`      | Normal application access.                              | Not applicable.                                  |
| `deactivated` | Restricted-account screen with reactivation and logout. | The user may change the status back to `active`. |
| `suspended`   | Restricted-account screen without reactivation.         | Only an administrator may restore the account.   |

The client never provides an action that writes `suspended`. Firestore rules
allow owners to create/read/update only their own document, validate the exact
schema, deny deletion, control timestamps, and restrict status transitions.
Suspended profiles are read-only to the client. Administrative Console or Admin
SDK writes bypass client rules and can restore them.

## Session coordination

The Session store is the application-level readiness state machine:

```ts
type SessionPhase = 'idle' | 'restoring-auth' | 'loading-profile' | 'ready' | 'error'
```

Derived state:

- `isBusy`: Auth restoration or initial profile loading;
- `isReady`: the session has resolved successfully;
- `isBlocking`: startup work or a session error requires the global overlay.

`ensureReady()` behaves as follows:

- restore Auth if it has not initialized;
- consider an unauthenticated session ready without connecting a profile;
- connect the authenticated user's profile and wait for its first snapshot;
- enter `error` if Auth restoration or initial profile connection fails;
- reuse the same promise for concurrent guards or components;
- return immediately for the already resolved UID.

The store watches the observed UID synchronously. A UID change invalidates the
previous resolution, disconnects the previous profile, and automatically starts
resolution for the new identity. If the UID changes during a profile
connection, the old result is discarded and resolution continues with the new
user.

It also watches Auth observer errors and profile connection errors. Initial and
later connection failures fail closed: protected interaction remains blocked
until retry or logout. Profile mutations do not move a ready session back to a
loading phase.

`retry()` invalidates the failed lifecycle, disconnects the profile, and runs a
fresh readiness resolution. It does not introduce a public force flag.

## Router integration

Every navigation awaits only `sessionStore.ensureReady()`. Guards do not call
Auth or profile synchronization directly.

After readiness, `getSessionRedirect()` applies a pure policy:

| Session and destination                           | Result                                            |
| ------------------------------------------------- | ------------------------------------------------- |
| Signed out, home                                  | Welcome page.                                     |
| Signed out, another protected route               | Login with the original `fullPath` in `redirect`. |
| Signed in, active, guest-only route               | Home.                                             |
| Signed in, deactivated or suspended, normal route | Restricted-account page.                          |
| Signed in, active, restricted-account page        | Home.                                             |
| Signed in, restricted, restricted-account page    | Allow navigation.                                 |

If readiness fails, navigation goes to the neutral `session-error` route while
preserving the original destination in `redirect`. Redirect values are accepted
only when they are local absolute paths beginning with one `/`; protocol-relative
paths are rejected.

Session reconciliation watchers reapply the same policy when:

- Auth changes externally, including another tab signing in or out;
- the realtime profile status changes;
- a ready profile listener later fails.

Local login/logout transitions are not redirected by the external-change
watcher. Their initiating page retains control of the intended destination.

## Global loading and error feedback

`App.vue` always keeps `RouterView` mounted. It never replaces the route tree
with a spinner. While the session blocks interaction, the RouterView container
receives `inert`, which removes its descendants from pointer and keyboard
interaction.

`SessionFeedbackOverlay.vue` renders above the route tree:

- an accessible spinner during `restoring-auth` and `loading-profile`;
- an error card during `error`;
- retry and logout actions;
- temporary blocking while those actions navigate.

A successful retry returns to the safe destination stored by the router. A
successful logout resolves the anonymous session and navigates to the welcome
page. Navigation state is cleared in `finally` blocks so a router failure cannot
leave the overlay permanently loading.

## Account-management flows

### Display name

Updating a display name writes Firebase Auth first and Firestore second. The
profile listener reflects the Firestore write. A later reconciliation repairs
identity divergence if only the Auth write succeeded.

### Verified email change

Email/password users reauthenticate with their password. Google users
reauthenticate through a popup. Firebase sends a verification link to the new
address. After the link is completed, the page reloads the Firebase user,
refreshes its ID token, and invokes `profileStore.reconcile(user)`.

### Deactivation and reactivation

Deactivation writes profile status `deactivated`; the realtime listener applies
the restricted policy, and the action signs the user out. A later login connects
the same profile and routes to the restricted-account page. Reactivation writes
`active`; suspended accounts never render this action.

## Invariants

The implementation should preserve these guarantees:

- at most one active Auth observer;
- exactly one profile listener for the resolved UID;
- no profile listener for an unauthenticated session;
- normal navigation does not reconcile or reload the profile;
- callbacks from disconnected users cannot mutate current state;
- the Auth observer is the only writer of the current Firebase user;
- profile listener data is the only writer of the connected profile;
- initial connection errors block protected interaction;
- later mutations do not replace the whole application with a spinner;
- client routing never substitutes for Firestore Security Rules.

## Test coverage

The relevant suites are:

- `tests/auth.store.spec.ts`: observer lifecycle and Auth operations;
- `tests/profile.store.spec.ts`: connection deduplication, listener ownership,
  stale callbacks, realtime updates, and mutation errors;
- `tests/session.store.spec.ts`: all readiness transitions, concurrency, UID
  changes, retry, and error races;
- `tests/session-policy.spec.ts`: redirect matrix and safe redirects;
- `tests/router.reconciliation.spec.ts`: external Auth/status changes and late
  listener failures;
- `tests/app.session-feedback.spec.ts`: mounted RouterView, overlay, retry, and
  logout;
- `tests/firestore.rules.spec.ts`: owner isolation, schema validation, and status
  transitions.
