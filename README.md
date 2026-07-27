# Vue + Firebase Starter

Personal starter for building client-side Vue SPAs with Firebase Authentication,
Cloud Firestore, protected routes, user profiles, and local emulators.

The project intentionally does not include SSR, Firebase Hosting, Functions,
Storage, App Check, CI, or E2E tooling. Add those features only when a derived
project needs them.

## Included

- Vue, Vue Router, and Pinia with TypeScript.
- Email/password and Google authentication.
- Account recovery, verified email changes, password changes, and account deactivation.
- Auth session restoration before route guards run.
- Private `users/{uid}` profiles and account status controls in Cloud Firestore.
- Separate Pinia stores for authentication state and profile state.
- Auth and Firestore emulators.
- Unit tests and isolated Firestore Security Rules tests.

## Phase 1 - Configure the Firebase project

### 1. Create a Firebase project

In the Firebase Console:

```text
Create a project
> Name: replace-with-your-project-id
> Google Analytics: optional
> Create project
```

### 2. Register the web app

Inside the new project:

```text
Project settings
> General
> Your apps
> Add app
> Web
```

Register the app without enabling Firebase Hosting. Firebase displays a web
configuration containing:

```ts
const firebaseConfig = {
  apiKey: '...',
  authDomain: '...',
  projectId: '...',
  storageBucket: '...',
  messagingSenderId: '...',
  appId: '...',
}
```

These values identify the Firebase project; they are not administrative
credentials. Firebase Security Rules and Authentication provide the actual
access control. Never put private server credentials in a `VITE_` variable.

### 3. Enable Authentication providers

Open:

```text
Security
> Authentication
> Sign-in method
```

Enable:

```text
Email/Password
Google
```

For Google, select a project support email and save. Email link authentication
is not used by this starter.

Review the following Authentication settings:

- **Authorized domains:** under `Authentication > Settings`, add every domain
  that will host the SPA. Use only the hostname, without protocol, path, or port.
  `localhost` is normally used for local development.
- **Password policy:** under `Authentication > Settings > Password policy`,
  enable enforcement. A sensible baseline is at least 12 characters with
  lowercase, uppercase, numeric, and non-alphanumeric characters. The app reads
  this policy and shows its requirements during registration and password changes.
  Tightening the policy does not normally invalidate existing passwords: those
  users can continue signing in. Enable Firebase's **Force upgrade on sign-in**
  option only when existing email/password users must change their password at
  their next sign-in; test the recovery flow before enabling it in production.
- **Email templates:** under `Authentication > Templates`, review the email
  verification template and its sender details. Firebase uses it when users
  confirm an email change. Test delivery to a real inbox before launch.
- **Email enumeration protection:** keep it enabled. Newer Firebase projects
  enable it by default. The application already uses neutral password-reset and
  login responses that are compatible with it.

Official references:

- [Google sign-in](https://firebase.google.com/docs/auth/web/google-signin)
- [Password authentication and policy](https://firebase.google.com/docs/auth/web/password-auth)
- [Firebase security checklist](https://firebase.google.com/support/guides/security-checklist)

### 4. Create Cloud Firestore

Open:

```text
Build
> Firestore Database
> Create database
```

Choose:

```text
Edition: Standard
Security Rules mode: Production
Location: appropriate for the derived project
```

The Firestore location is effectively permanent after database creation. This
starter currently declares the default database in `eur3` inside
`firebase.json`, which is suitable for personal projects located in Europe. If
a derived project uses another location, change the `location` value in
`firebase.json` before its first Firestore deployment so the repository
documents the real choice.

Do not leave a project using temporary test-mode rules.

## Phase 2 - Connect the local repository

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure the environment

Copy `.env.example` to `.env` and fill in the web configuration shown by the
Firebase Console:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

VITE_USE_FIREBASE_EMULATORS=false
```

The app fails early with a clear error if a required value is missing. `.env`
and `.firebaserc` are ignored by Git; their example files are tracked.

### 3. Select the Firebase project

Sign in and associate the derived repository with its Firebase project:

```bash
pnpm exec firebase login
pnpm exec firebase use --add
```

Check that the generated `.firebaserc` contains the intended project ID:

```json
{
  "projects": {
    "default": "replace-with-your-project-id"
  }
}
```

The Firebase configuration, rules, indexes, and emulators are already
initialized in this repository. Do not run `firebase init` unless a derived
project intentionally needs to add or reconfigure Firebase products.

`VITE_FIREBASE_PROJECT_ID` selects the project used by the browser. `.firebaserc`
selects the project targeted by Firebase CLI deployments. Check that both point
to the intended environment before releasing.

## Phase 3 - Develop with local emulators

Set this value in `.env`:

```env
VITE_USE_FIREBASE_EMULATORS=true
```

Start Firebase and Vite in separate terminals:

```bash
pnpm firebase:emulators
```

```bash
pnpm dev
```

Local services:

```text
Application:        http://localhost:5173
Emulator UI:        http://localhost:4000
Authentication:     http://localhost:9099
Cloud Firestore:    http://localhost:8080
```

Emulator connections are enabled only in Vite development mode and when
`VITE_USE_FIREBASE_EMULATORS=true`. A production build cannot connect through
this code path.

### Auth Emulator password-policy limitation

The Auth Emulator does not implement Firebase's `v2/passwordPolicy` endpoint.
For local registration, this starter therefore applies the emulator's default
minimum of six characters without making that unsupported request.

Production registration always reads the real Firebase password policy.
Consequently, a locally accepted password may still fail in production if the
project requires additional complexity or a longer minimum. Test custom
policies against the real project when they are important to a derived app.

The emulators do not deliver real verification or password-reset emails. Test
those flows against a real Firebase project and check Spam/Promotions folders.

### Manual test checklist

```text
1. Open / while signed out: it should redirect to /welcome.
2. Open /profile while signed out: it should redirect to
   /login?redirect=/profile.
3. Register an email/password account: it should redirect to /.
4. Reload: the authenticated session should be restored.
5. Open /login while authenticated: it should redirect to /.
6. Update the display name from /profile.
7. Sign out: it should return to /welcome.
8. Change the password for an email/password account.
9. Request a password-reset email.
10. Verify an email change against a real project.
11. Deactivate an account, sign in again, and reactivate it.
12. Suspend an account manually and confirm it cannot self-reactivate.
13. Sign in through the Google emulator popup.
14. Confirm the private users/{uid} document in the Emulator UI.
```

Google login through the emulator does not use a real Google account. The
emulator popup accepts simulated provider data.

## Phase 4 - Authentication and account management

Firebase Authentication is the source of truth for the signed-in identity.
`onAuthStateChanged` restores the session before protected route guards decide
where to navigate.

`auth.store.ts` owns Firebase Authentication state and operations.
`profile.store.ts` owns the Firestore profile lifecycle, loading state, retry,
updates, and profile-specific errors.

After authentication, the app creates or reconciles this private Firestore
document:

```text
users/{firebaseAuthUid}
```

```ts
interface UserProfile {
  email: string | null
  displayName: string
  photoURL: string | null
  status: 'active' | 'deactivated' | 'suspended'
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

New profiles always start as `active`. The app keeps identity fields in this
document synchronized with Firebase Authentication whenever the account is active.

### What users can manage

- **Email address:** users request a verified change from Profile. Email/password
  users confirm their current password; Google users complete a normal Google
  reauthentication popup. The popup is expected. Firebase sends the confirmation
  link to the _new_ address; check Spam/Promotions if it is delayed. The profile
  is synchronized after the link has been opened.
- **Password:** this is available only to email/password users. It requires the
  current password and follows the Firebase password policy. Google-only users
  manage their password with Google instead.
- **Password reset:** the sign-in screen sends Firebase's standard reset email.
  The hosted Firebase reset page also enforces the configured policy.
- **Deactivation:** a user can deactivate their account without losing data.
  The app signs them out; after the next sign-in they can reactivate it from the
  restricted account screen.

### Account states

| Status        | User experience                                                                                                     | Who can restore access                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `active`      | Full application access.                                                                                            | Not applicable.                                                                                                   |
| `deactivated` | No normal access; the restricted screen offers reactivation or sign-out.                                            | The user or a project administrator.                                                                              |
| `suspended`   | No normal access and no self-service reactivation. Show a support/contact path appropriate for the derived product. | A Firebase project administrator, using the Firestore Console or Admin SDK, by setting `status` back to `active`. |

Firestore Console and Admin SDK operations are administrative and bypass client
Security Rules. This is intentional: a project owner can restore a suspended
account, while the user cannot. Do not expose a client-side action that writes
`suspended`.

To suspend or restore an account manually, edit `users/{uid}.status` in the
Firestore Console. Derived projects should replace the suspended-account message
with a real support contact.

Authentication success and profile synchronization are intentionally separate.
If Firestore is temporarily unavailable, login still succeeds and the
application displays a retry action for the profile.

Firebase Auth and Firestore are separate services, so updating both cannot be a
single atomic operation. The profile synchronization process reconciles
identity fields on a later retry or session restoration if one service
succeeded while the other failed.

## Phase 5 - Firestore Security Rules

`firestore.rules` protects `users/{uid}` with:

- owner-only create, read, and update access;
- no client-side deletion;
- an exact field allowlist;
- string length, type, email, and HTTPS URL validation;
- email equality with the Firebase Auth token;
- immutable `createdAt`;
- server-controlled `createdAt` and `updatedAt`;
- controlled account-state transitions: users can deactivate and reactivate only
  their own deactivated account; suspended accounts are read-only from the client;
- default denial for every other path, including user subcollections.

`firestore.rules.audit.md` records the assumptions and red-team checklist.
Automated rules tests run against an isolated Standard-edition Firestore
emulator on port `8081`.

Deploy rules and indexes only after selecting the correct Firebase project:

```bash
pnpm firebase:deploy:rules
```

Always verify the active project before deployment:

```bash
pnpm exec firebase use
```

## Phase 6 - Deploy

Add the Firebase web configuration from `.env` to the hosting platform's
production environment. Copy each value exactly, without surrounding quotes,
commas, or other characters copied from a JSON snippet.

Before releasing:

- Add the production domain, preview domains that need sign-in, and any other
  intended hostnames under `Authentication > Settings > Authorized domains` in
  the Firebase Console. Enter hostnames only, without protocol, path, or port.
- Confirm the production Firebase project is selected with `pnpm exec firebase use`.
- Confirm that `.firebaserc` and `VITE_FIREBASE_PROJECT_ID` target the intended
  production project.
- Deploy the current Firestore rules and indexes with `pnpm firebase:deploy:rules`.
- Test email/password sign-in, Google sign-in, password reset, and the verified
  email-change flow on the deployed domain.

Keep `VITE_USE_FIREBASE_EMULATORS=false` in production. The app only connects
to emulators in Vite development mode, but this value makes the deployment
intent explicit.

---

## Quality checks

Run all unit and Security Rules tests:

```bash
pnpm test
```

Run static checks and the production build:

```bash
pnpm type-check
pnpm lint
pnpm build
pnpm format:check
```

`pnpm lint` applies safe automatic fixes. Use `pnpm format` when formatting
changes should be written.

## Starting a derived project

1. Copy or clone this repository.
2. Change the package name and visible application name.
3. Create and configure the Firebase project through the Console.
4. Copy `.env.example` to `.env` and insert the new web configuration.
5. Run `pnpm exec firebase use --add`.
6. Configure authorized domains, the password policy, and email templates in
   Firebase Authentication.
7. Confirm that the Firestore location in `firebase.json` matches the database.
8. Deploy Firestore rules with `pnpm firebase:deploy:rules`.
9. Start the emulators and complete the manual checklist.
10. Run the complete quality checks before adding project-specific features.
