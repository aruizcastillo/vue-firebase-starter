# Vue + Firebase Starter

## 1. Crear un proyecto en Firebase

En Firebase Console:

```text
1. Crear proyecto.
2. Nombre: vue-firebase-starter-dev
3. Google Analytics: desactivado por ahora.
4. Crear proyecto.
```

Después, dentro del proyecto:

```text
Configuración del proyecto
→ Tus aplicaciones
→ Añadir aplicación
→ Web
```

Nombre sugerido:

```text
vue-firebase-starter
```

No actives Firebase Hosting todavía.

Firebase mostrará una configuración parecida a esta:

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

Guarda los valores en variables de entorno.

## 3. En `.env`

En la raíz del proyecto:

```text
vue-firebase-starter/
├── .env
├── package.json
└── src/
```

Contenido:

```env
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu_project_id
VITE_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
VITE_FIREBASE_APP_ID=tu_app_id

VITE_USE_FIREBASE_EMULATORS=false
```

Vite expone al código cliente las variables que comienzan por `VITE_` mediante `import.meta.env`. Estas variables forman parte del bundle del navegador, por lo que no deben contener secretos privados.

La configuración web de Firebase no es una credencial administrativa. La seguridad real dependerá de Authentication y de las reglas de Firestore.

## 5. Revisar `.gitignore`

Comprueba que incluya:

```gitignore
.env
.env.*
!.env.example
```

## 14. Activar Authentication

En Firebase Console:

```text
Build
→ Authentication
→ Comenzar
→ Sign-in method
→ Correo electrónico/contraseña
→ Activar
```

Activa únicamente:

```text
Correo electrónico/contraseña
```

No actives todavía:

```text
Vínculo de correo electrónico
```

Google lo configuraremos más adelante.

## 15. Crear Firestore

En Firebase Console:

```text
Build
→ Firestore Database
→ Crear base de datos
```

Selecciona:

```text
Producción
```

Región recomendada para Europa:

```text
eur3
```

o la región disponible que prefieras.

No uses modo de prueba como configuración permanente. Más adelante crearemos las reglas definitivas.

## 16. Ejecutar Firebase CLI

Comprueba:

```bash
pnpm exec firebase --version
```

Inicia sesión:

```bash
pnpm exec firebase login
```

## 17. Inicializar Firebase CLI

Desde la raíz del proyecto:

```bash
pnpm exec firebase init
```

Selecciona:

```text
Firestore
Emulators
```

No selecciones:

```text
Hosting
Functions
Storage
App Hosting
Data Connect
```

Cuando pregunte por el proyecto:

```text
Use an existing project
```

Selecciona el proyecto creado anteriormente.

Para Firestore:

```text
Rules file:
firestore.rules

Indexes file:
firestore.indexes.json
```

Para emuladores:

```text
Authentication Emulator
Firestore Emulator
Emulator UI
```

Puertos:

```text
Authentication: 9099
Firestore:      8080
Emulator UI:    4000
```

Descarga los emuladores cuando la CLI lo solicite.

## 18. Archivos generados

La raíz debería contener:

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

Crear `.firebaserc`:

```json
{
  "projects": {
    "default": "replace-with-your-project-id"
  }
}
```

Cada repositorio derivado ejecutará:

```bash
pnpm exec firebase use --add
```

## 19. Revisar `firebase.json`

Debe quedar aproximadamente así:

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

## 21. Probar los emuladores

Cambia temporalmente `.env`:

```env
VITE_USE_FIREBASE_EMULATORS=true
```

Arranca Firebase:

```bash
pnpm firebase:emulators
```

En otra terminal:

```bash
pnpm dev
```

Abre:

```text
http://127.0.0.1:4000
```

Deberías ver:

```text
Authentication Emulator
Firestore Emulator
```

Después prueba también:

```bash
pnpm type-check
pnpm lint
pnpm build
```

## Estructura tras la fase 2

```text
vue-firebase-starter/
├── .env
├── .env.example
├── .firebaserc.example
├── firebase.json
├── firestore.indexes.json
├── firestore.rules
├── package.json
│
└── src/
    ├── assets/
    ├── components/
    ├── composables/
    ├── firebase/
    │   ├── app.ts
    │   ├── auth.ts
    │   ├── config.ts
    │   ├── emulators.ts
    │   └── firestore.ts
    ├── pages/
    │   └── HomePage.vue
    ├── router/
    │   └── index.ts
    ├── services/
    ├── stores/
    ├── styles/
    │   └── main.css
    ├── types/
    ├── App.vue
    ├── env.d.ts
    └── main.ts
```

## Definition of done

```text
Firebase SDK instalado                  ✓
Variables tipadas                       ✓
Variables obligatorias validadas        ✓
Firebase App inicializada               ✓
Authentication inicializado             ✓
Firestore inicializado                  ✓
Emuladores conectables por variable     ✓
Firebase CLI instalada localmente       ✓
Auth Emulator funcionando               ✓
Firestore Emulator funcionando          ✓
Build y type-check correctos             ✓
```

Todavía no debe existir lógica de usuarios, login, registro, documentos o stores de autenticación. Eso empieza en la fase 3.

[1]: https://firebase.google.com/docs/web/setup?utm_source=chatgpt.com "Add Firebase to your JavaScript project  |  Firebase for web platforms"
[2]: https://es.vite.dev/guide/env-and-mode?utm_source=chatgpt.com "Variables de Entorno y Modos | Vite"
[3]: https://firebase.google.com/docs/auth/web/start?utm_source=chatgpt.com "Get Started with Firebase Authentication on Websites"
[4]: https://firebase.google.com/docs/emulator-suite/connect_auth?utm_source=chatgpt.com "Connect your app to the Authentication Emulator  |  Firebase Local Emulator Suite"
