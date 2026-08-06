# Vue + Firebase Starter

Starter for Vue applications using Firebase Authentication and
Cloud Firestore. Use it as the foundation for a derived
project, then connect it to its own Firebase environment.

## Included

- Vue, TypeScript, Vue Router, Pinia, Vue-i18n, Tailwind CSS, shadcn-vue, Formisch and Valibot.
- English and Spanish interface translations.
- Email/password and Google authentication.
- Registration, password reset and change, verified email change, and optional account deactivation.
- Protected, public, guest-only, and optional restricted-account routes.
- Optional private Firestore profiles for authenticated users.
- Firebase Auth and Firestore emulators, unit tests, and Firestore Security Rules tests.

## Architecture

Firebase Authentication is the sole source for identity: UID, email, display
name, photo URL, providers, and verification state. The starter never copies
those fields to Firestore. The default auth-only mode considers the session
ready as soon as Auth restoration finishes.

```text
Firebase Auth user
  -> session readiness
  -> route access and application UI

profile mode: users/{uid} is created and loaded only when a feature needs it
full mode: session readiness also waits for the users/{uid} status listener
```

In full mode, `users/{uid}` is private to its owner and contains only
application-owned metadata and account status:

```ts
{
  status: 'active' | 'deactivated' | 'suspended'
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

Active accounts have normal access. Deactivated accounts can reactivate from
the restricted-account screen; suspended accounts require an administrator to
restore them. Firestore Security Rules enforce data access and status
transitions; route guards are only a client-side user-experience layer.

Projects that do not need profiles or account status can disable those features
as described in [Choose the authentication mode](#choose-the-authentication-mode).

See [Data models and persistence](docs/data-models/README.md) for the exact
stored shape and source of truth for every field.

For implementation details, lifecycle states, realtime listeners, error
handling, and test coverage, see [the internal authentication documentation](docs/auth/README.md).

## Customization and themes

The visual system is token-based, so a derived project can customize the
interface from one place instead of restyling individual components. Update
`src/styles/themes.css`: `:root` contains values shared by every theme (fonts,
base font size, and radius), and each `[data-theme]` block contains the color
tokens for that theme. The file includes the shadcn-vue semantic tokens and the
project-specific status tokens such as success, warning, error, info, and hint.

`src/main.css` registers those tokens with Tailwind through `@theme inline`.
Use semantic utilities such as `bg-background`, `text-foreground`,
`bg-primary`, or `border-border` (and the custom token utilities) directly;
they stay connected to the CSS variables, so there is no need to use arbitrary
value syntax such as `bg-(--custom-color)`.

Themes are selected by a `data-theme` attribute on an ancestor of the app. The
starter sets it on the `<html>` element in `index.html`:

```html
<html lang="en" data-theme="light"></html>
```

Set it to `dark` to use the dark token values. Tailwind's `dark:` variant is
configured to follow `[data-theme="dark"]`, so `dark:` utilities work with the
same attribute. When adding another theme, add its `[data-theme='theme-name']`
token
block and configure any variant behavior it needs; only the `dark` theme is
currently wired to Tailwind's `dark:` variant.

## Requirements

- Node.js `^22.18.0` or `>=24.12.0`.
- pnpm.
- A Firebase project with access to the Firebase Console.

## 1. Prepare the derived project

Clone or copy the starter, then update:

- the package name in `package.json`;
- the title and description in `index.html`;
- `app.name` in `src/locales/en.json` and `src/locales/es.json`.

Install dependencies:

```bash
pnpm install
```

## 2. Create and configure Firebase

### Register a web application

Create a Firebase project and register a Web app from:

```text
Firebase Console > Project settings > General > Your apps
```

Firebase will display the public web configuration needed in the next step.
Do not enable Firebase Hosting unless the derived project will use it.

### Configure Authentication

Open:

```text
Firebase Console > Authentication > Sign-in method
```

Enable:

- Email/Password;
- Google.

Then review these Authentication settings:

- Add `localhost` and every deployed hostname under **Authorized domains**.
  Enter hostnames only, without protocol, path, or port.
- Configure and enforce an appropriate password policy.
- Review the password-reset and email-verification templates.
- Keep email-enumeration protection enabled.

### Create Cloud Firestore

Create the default Cloud Firestore database with:

- Standard edition;
- Production mode;
- the location selected for the derived project.

The database location cannot normally be changed later. Update the `location`
in `firebase.json` before the first deployment if the project does not use the
provided `eur3` location. Do not use temporary test-mode rules.

## 3. Configure the repository

Create `.env` from `.env.example` and copy the Firebase web configuration:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

VITE_USE_FIREBASE_EMULATORS=false
```

Never place Admin SDK credentials or other private server secrets in `VITE_`
variables.

### Choose the authentication mode

The three modes separate identity from optional application data. Firebase Auth
always provides email, display name, and provider photo. The difference is
whether the project enables `users/{uid}` and whether that document has an
account status:

- **Auth only:** no starter Firestore user document.
- **Auth + profile:** a metadata-only private document, loaded or created on
  demand and ready to extend with application-specific fields.
- **Full:** the same metadata plus status, loaded at session startup so the
  starter can react to account changes.

In `src/config/auth.config.ts`, change only `authMode` to select a mode:

| Mode                            | `authMode`    | Recommended when                                             | Rules deployment                       |
| ------------------------------- | ------------- | ------------------------------------------------------------ | -------------------------------------- |
| Firebase Auth only              | `'auth-only'` | Auth is enough, or you will define your own database model.  | `pnpm firebase:deploy:rules:auth-only` |
| Firebase Auth + profile         | `'profile'`   | You want a private `users/{uid}` base for app-specific data. | `pnpm firebase:deploy:rules:profile`   |
| Auth + profile + account status | `'full'`      | You want account status available during session routing.    | `pnpm firebase:deploy:rules:full`      |

Auth-only is the default. A derived project opts into profile or full mode only
when it needs those capabilities. The configuration derives the required
features from the selected mode, so unsupported combinations are not possible.

Sign in to Firebase CLI and associate the repository with the new project:

```bash
pnpm exec firebase login
pnpm exec firebase use --add
```

Verify the active project before every deployment:

```bash
pnpm exec firebase use
```

The Firebase files are already initialized. Running `firebase init` is not
required unless the derived project intentionally adds another Firebase
product.

## 4. Deploy Firestore configuration

Deploy the rules and indexes that match the authentication mode selected above.

For Firebase Auth only (the default), run:

```bash
pnpm firebase:deploy:rules:auth-only
```

For Firebase Auth + profile, without account status, run:

```bash
pnpm firebase:deploy:rules:profile
```

For Firebase Auth + profile + account status, run:

```bash
pnpm firebase:deploy:rules:full
```

The `firebase:deploy:rules` command is an alias for the default auth-only rule
set.
Auth-only rules deny all Firestore access until the derived project adds
explicit rules for its business collections.

Full mode makes `status` available to the derived project and the starter uses
it for its restricted-account routes. Adapt that policy to the product. If
status should also restrict backend data, business-collection rules should
check for an active account; client routing alone is not authorization.

Review and extend the rules whenever a derived project adds collections or
changes its data model.

## 5. Develop locally

To use the local Firebase emulators, set:

```env
VITE_USE_FIREBASE_EMULATORS=true
```

Start Firebase and Vite in separate terminals. The default command uses
auth-only rules; use the command matching another selected mode:

```bash
pnpm firebase:emulators
pnpm firebase:emulators:profile
pnpm firebase:emulators:full
```

```bash
pnpm dev
```

Local addresses:

| Service           | URL                     |
| ----------------- | ----------------------- |
| Application       | `http://localhost:5173` |
| Firebase Emulator | `http://localhost:4000` |
| Authentication    | `http://localhost:9099` |
| Cloud Firestore   | `http://localhost:8080` |

The emulators do not deliver real password-reset or email-verification emails.
Test those flows with a non-production Firebase project before release.

## 6. Validate the project

Run the automated tests and production checks:

```bash
pnpm test
pnpm type-check
pnpm lint
pnpm build
pnpm format:check
```

Before release, confirm that:

- `.firebaserc` and `VITE_FIREBASE_PROJECT_ID` target the intended environment;
- every deployed hostname is authorized in Firebase Authentication;
- current Firestore rules and indexes have been deployed;
- email/password, Google, password reset, and verified email changes work on the
  deployed domain;
- `VITE_USE_FIREBASE_EMULATORS=false` is set in the deployed environment.
