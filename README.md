# Vue + Firebase Starter

Starter for Vue applications using Firebase Authentication and
Cloud Firestore. Use it as the foundation for a derived
project, then connected to its own Firebase environment.

## What's included

- Vue, TypeScript, Vue Router, Pinia, Vue-i18n, Tailwind CSS, and shadcn-vue.
- English and Spanish interface translations.
- Email/password and Google authentication.
- Registration, password reset and change, verified email change, and account
  deactivation.
- Protected, public, guest-only, and restricted-account routes.
- A private Firestore profile for every authenticated user.
- Firebase Auth and Firestore emulators, unit tests, and Firestore Security
  Rules tests.

## Architecture at a glance

Firebase Authentication owns the signed-in identity. After Auth restores or
changes a user, the application connects that user's Firestore profile and only
then considers the session ready for protected navigation.

```text
Firebase Auth user
  -> session readiness
  -> users/{uid} Firestore profile
  -> route access and application UI
```

`users/{uid}` is private to its owner and contains the identity fields mirrored
from Firebase Auth, timestamps, and an account status:

```ts
{
  email: string | null
  displayName: string
  photoURL: string | null
  status: 'active' | 'deactivated' | 'suspended'
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

Active accounts have normal access. Deactivated accounts can reactivate from
the restricted-account screen; suspended accounts require an administrator to
restore them. Firestore Security Rules enforce data access and status
transitions; route guards are only a client-side user-experience layer.

For implementation details, lifecycle states, realtime listeners, error
handling, and test coverage, see [the internal authentication documentation](docs/auth/README.md).

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

Deploy the included rules and indexes to the selected Firebase project:

```bash
pnpm firebase:deploy:rules
```

Review and extend the rules whenever a derived project adds collections or
changes its data model.

## 5. Develop locally

To use the local Firebase emulators, set:

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
