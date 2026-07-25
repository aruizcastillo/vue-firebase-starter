# Plan de puesta en producción y evolución

Contexto para retomar el proyecto. La plantilla está pensada para SPAs
personales con Vue, Firebase Authentication y Cloud Firestore.

## Estado actual

- Autenticación email/password y Google.
- Restauración de sesión antes de evaluar rutas protegidas.
- Stores separados para auth y perfil (`auth.store.ts`, `profile.store.ts`).
- Perfil privado en `users/{uid}`.
- Reglas de Firestore, emuladores y pruebas configurados.
- Build de producción válido.

## Antes de publicar una aplicación derivada

### Firebase Console

1. Crear o seleccionar el proyecto y registrar la aplicación web.
2. Copiar la configuración al `.env` de producción y mantener
   `VITE_USE_FIREBASE_EMULATORS=false`.
3. Activar los proveedores necesarios (actualmente Email/Password y Google).
4. Añadir el dominio final a Authorized domains y revisar OAuth de Google.
5. Revisar política de contraseñas y protección de Auth.
6. Crear Firestore en modo producción y elegir región. `firebase.json` declara
   `eur3`; debe coincidir con la decisión del proyecto.

### Repositorio y despliegue

1. Asociar el repositorio al proyecto correcto.
2. Ejecutar `pnpm build` y desplegar reglas e índices.
3. Publicar `dist` en un hosting con fallback SPA a `index.html`.
4. Verificar registro, login, Google, logout, recarga, reset de contraseña,
   perfil y aislamiento entre usuarios.

Firebase Hosting no forma parte de esta plantilla; puede añadirse en un
proyecto derivado.

## Decisiones deliberadas del alcance

Por ahora no se incluyen SSR, Functions, Storage, Data Connect, App Check, CI,
E2E ni despliegue automatizado. Tampoco se impone verificación de email,
reauthenticación o desactivación: se documentan como evolución opcional.
La eliminación irreversible de cuentas queda fuera del alcance; la opción
preferida es una baja lógica.

## Evolución de identidad y cuentas

### 1. Verificación de email

1. Tras registrar una cuenta email/password, enviar el correo con
   `sendEmailVerification`.
2. Exponer `emailVerified` en el store y ofrecer reenvío.
3. Recargar el usuario (`reload`) al volver del enlace y actualizar el estado.
4. Si el producto lo exige, proteger rutas o acciones sensibles con email
   verificado.
5. Probarlo en el proyecto real: el emulador de Auth no reproduce el correo de
   producción.

### 2. Reautenticación para operaciones sensibles

1. Exigir sesión reciente antes de cambiar email/contraseña o desactivar la
   cuenta; editar el perfil normal no la necesita.
2. Email/password usa `reauthenticateWithCredential`; Google,
   `reauthenticateWithPopup` con `GoogleAuthProvider`.
3. Tratar `auth/requires-recent-login` como estado esperado, mostrando una
   confirmación y reintentando la operación tras el éxito.
4. Cubrir ambos proveedores, cancelación, credenciales incorrectas y popup
   bloqueado.

### 3. Desactivación de cuenta (baja lógica)

La opción recomendada es una baja lógica, no borrar el UID ni eliminar la
cuenta irreversiblemente:

1. Reautenticar y pedir confirmación explícita.
2. Anonimizar datos personales de `users/{uid}` y conservar un mínimo como
   `status: "deactivated"` y `deactivatedAt`.
3. Bloquear el acceso funcional con ese estado y cerrar la sesión.
4. Ajustar `UserProfile`, servicio/store de perfil, reglas de Firestore y
   pruebas para el nuevo esquema.
5. Decidir qué ocurre con Firebase Auth: la SPA no puede garantizar de forma
   atómica la limpieza y desactivación de Auth. Para bloquear también la
   identidad se necesitaría backend/Cloud Function con Admin SDK; en una SPA
   personal puede bastar la baja lógica y el bloqueo de la aplicación.

La recuperación debe ser una decisión del producto (por ejemplo, soporte
manual), no una capacidad implícita de la plantilla.

## Otras mejoras opcionales

- Añadir Firebase Hosting si se quiere centralizar el despliegue.
- Añadir CI o pruebas E2E cuando existan varios proyectos derivados.
- Revisar políticas de contraseña y restricciones de acceso al crecer.

## Notas para retomar el trabajo

El Auth Emulator no reproduce políticas complejas de contraseña ni el flujo de
correo de producción. Auth y Firestore son servicios separados: una
actualización de perfil no es atómica entre ambos. Antes de ampliar la
plantilla, decidir si el requisito pertenece al núcleo común o a una aplicación
derivada.

### Criterio adoptado para la baja

La baja no impedira iniciar sesion en Firebase Auth. Al solicitarla, se
eliminaran los datos propios del producto y se anonimizaran los datos
personales, conservando solo un registro minimo de estado (por ejemplo,
`status: "deactivated"` y `deactivatedAt`). Tras iniciar sesion, la aplicacion
mostrara ese estado y decidira si permite reactivar la cuenta o empezar de
nuevo. No se requiere Functions ni Admin SDK para este enfoque.
