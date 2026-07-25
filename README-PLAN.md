# Plan de puesta en producción y evolución

Este documento sirve como contexto para retomar el proyecto más adelante. La
plantilla está pensada para SPAs personales con Vue, Firebase Authentication y
Cloud Firestore. No pretende incluir de antemano todas las capacidades de
Firebase ni convertirse en una plataforma genérica.

## Estado actual

- La autenticación email/password y Google está implementada.
- La sesión se restaura antes de evaluar las rutas protegidas.
- Auth y perfil tienen stores separados: `auth.store.ts` y `profile.store.ts`.
- El perfil privado vive en `users/{uid}`.
- Las reglas de Firestore validan propietario, esquema, tipos, tamaños y
  timestamps.
- Los emuladores, pruebas unitarias y pruebas de reglas están configurados.
- La plantilla funciona en desarrollo y el build de producción es válido.

## Antes de publicar una aplicación derivada

### Firebase Console

1. Crear o seleccionar el proyecto Firebase.
2. Registrar la aplicación web y copiar su configuración al `.env` de
   producción.
3. Mantener `VITE_USE_FIREBASE_EMULATORS=false`.
4. Activar los proveedores de Authentication que vaya a utilizar la
   aplicación: actualmente Email/Password y Google.
5. Añadir el dominio final en Authorized domains y comprobar la configuración
   OAuth de Google.
6. Revisar la política de contraseñas y los ajustes de protección de Auth.
7. Crear Firestore en modo producción y elegir la región antes de crear la
   base. El repositorio declara `eur3` en `firebase.json`; debe coincidir con
   la decisión del proyecto.

### Repositorio y despliegue

1. Asociar el repositorio al proyecto correcto con `pnpm exec firebase use
--add`.
2. Ejecutar `pnpm build`.
3. Desplegar reglas e índices con `pnpm firebase:deploy:rules`.
4. Publicar `dist` en el hosting elegido. Como es una SPA, el hosting debe
   redirigir las rutas desconocidas a `index.html`.
5. Verificar en el proyecto real registro, login, Google, logout, restauración
   tras recarga, reset de contraseña, actualización de perfil y aislamiento
   entre perfiles.

Firebase Hosting no forma parte de esta plantilla; puede añadirse en un
proyecto derivado si resulta conveniente.

## Decisiones deliberadas del alcance

Por ahora no se incluyen:

- SSR, Functions, Storage o Data Connect.
- Verificación obligatoria de email.
- Eliminación de cuentas y limpieza automática de perfiles.
- App Check.
- CI, E2E o un sistema de despliegue automatizado.

Estas ausencias no impiden publicar una SPA personal. Deben revisarse si el
proyecto derivado pasa a tener usuarios públicos, datos sensibles, abuso
automatizado o requisitos de cumplimiento.

## Próximas mejoras opcionales

### App Check

App Check puede añadirse cuando una aplicación pública necesite dificultar el
uso de Auth o Firestore desde clientes automatizados o no autorizados. Es una
capa adicional, no un sustituto de Authentication ni de las reglas de
Firestore. Su incorporación requiere configurar el proveedor web, los dominios
y el comportamiento de los emuladores; por eso no se activa por defecto en la
plantilla.

### Otros posibles pasos

- Añadir verificación de email, reautenticación o eliminación de cuentas si el
  producto lo necesita.
- Incorporar Firebase Hosting si se quiere centralizar también el despliegue.
- Añadir CI o pruebas E2E cuando la plantilla tenga varios proyectos derivados.
- Revisar políticas de contraseña y restricciones de acceso al crecer el
  número de usuarios.

## Notas para retomar el trabajo

La política de contraseñas del Auth Emulator no reproduce políticas complejas
del proyecto real: localmente se aplica el mínimo predeterminado de seis
caracteres. Además, Auth y Firestore son servicios separados, por lo que una
actualización de perfil no es una operación atómica entre ambos; el store de
perfil contempla la reconciliación mediante una nueva sincronización.

Antes de ampliar la plantilla conviene decidir primero si el nuevo requisito
pertenece al núcleo común de todos los proyectos o solamente a una aplicación
derivada.
