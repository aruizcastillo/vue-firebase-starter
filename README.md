# Vue + Firebase Starter

## Phase 1 - Setting up the Firebase project

### 1. Create a Firebase project

In the Firebase Console:

```text
1. Create a project.
2. Name: replace-with-your-project-id
3. Google Analytics: disabled for now.
4. Create the project.
```

Then, inside the project:

```text
Project settings
→ Your apps
→ Add app
→ Web
```

Do not enable Firebase Hosting yet.

Firebase will display configuration similar to this:

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

Save these values as environment variables.

### 2. Configure `.env`

At the project root:

```text
vue-firebase-starter/
├── .env
├── package.json
└── src/
```

Contents:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

VITE_USE_FIREBASE_EMULATORS=false
```

Vite exposes variables beginning with `VITE_` to client-side code through `import.meta.env`. These variables are included in the browser bundle, so they must not contain private secrets.

The Firebase web configuration is not an administrative credential. Real security depends on Authentication and Firestore Security Rules.

### 3. Check `.gitignore`

Make sure it includes:

```gitignore
.env
.env.*
!.env.example
```

### 4. Enable Authentication

In the Firebase Console:

```text
Build
→ Authentication
→ Get started
→ Sign-in method
→ Email/Password
→ Enable
```

Enable only:

```text
Email/Password
```

Do not enable yet:

```text
Email link
```

Google sign-in will be configured later.

### 5. Create Firestore

In the Firebase Console:

```text
Build
→ Firestore Database
→ Create database
```

Select:

```text
Production
```

Recommended region for Europe:

```text
eur3
```

Or choose any available region you prefer.

Do not use test mode as a permanent configuration. The final rules will be created later.

### 6. Run the Firebase CLI

Check the version:

```bash
pnpm exec firebase --version
```

Sign in:

```bash
pnpm exec firebase login
```

### 7. Initialize the Firebase CLI

From the project root:

```bash
pnpm exec firebase init
```

Select:

```text
Firestore
Emulators
```

Do not select:

```text
Hosting
Functions
Storage
App Hosting
Data Connect
```

When asked to choose a project:

```text
Use an existing project
```

Select the project created earlier.

For Firestore:

```text
Rules file:
firestore.rules

Indexes file:
firestore.indexes.json
```

For emulators:

```text
Authentication Emulator
Firestore Emulator
Emulator UI
```

Ports:

```text
Authentication: 9099
Firestore:      8080
Emulator UI:    4000
```

Download the emulators when prompted by the CLI.

### 8. Generated files

The project root should contain:

```text
vue-firebase-starter/
├── .env
├── .env.example
├── .firebaserc
├── firebase.json
├── firestore.indexes.json
├── firestore.rules
├── package.json
└── src/
```

Check `.firebaserc`:

```json
{
  "projects": {
    "default": "replace-with-your-project-id"
  }
}
```

Each derived repository should run:

```bash
pnpm exec firebase use --add
```

### 9. Check `firebase.json`

It should look approximately like this:

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "emulators": {
    "auth": {
      "port": 9099
    },
    "firestore": {
      "port": 8080
    },
    "ui": {
      "enabled": true,
      "port": 4000
    },
    "singleProjectMode": true
  }
}
```

## Phase 2 — Authentication

### 1. Enable Google in Firebase

In Firebase Console:

```text
Authentication
→ Sign-in method
→ Google
→ Enable
```

Select a support email and save.

The web SDK supports authentication through Google using `GoogleAuthProvider` and `signInWithPopup`. On the first login, Firebase automatically creates the Authentication account.

### 2. Test with emulators

In `.env`:

```env
VITE_USE_FIREBASE_EMULATORS=true
```

Terminal 1:

```bash
pnpm firebase:emulators
```

Terminal 2:

```bash
pnpm dev
```

Test this flow:

```text
1. Open /
2. It should redirect to /login?redirect=/
3. Open /register
4. Create an account
5. It should redirect to /
6. Reload the page
7. The session should remain active
8. Try to open /login
9. It should redirect to /
10. Sign out
11. It should return to /login
12. Test password recovery
13. Test Google login
```

When using Google with emulators, the flow does not use a real account: the emulator displays an interface where you can enter simulated provider data.

The profile document, its retrieval, and its synchronization with the store will be implemented in the next phase.

## Phase 3