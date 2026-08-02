# Validación de formularios

Esta aplicación usa **Formisch** para el estado y envío de formularios, **Valibot** para validar y transformar datos, y los componentes `Field` de **shadcn-vue** para la interfaz accesible. Las notificaciones transitorias se muestran con `vue-sonner`.

## Dependencias

| Paquete         | Responsabilidad                                                              |
| --------------- | ---------------------------------------------------------------------------- |
| `@formisch/vue` | Estado del formulario, validación, envío, errores y foco del campo inválido. |
| `valibot`       | Esquemas tipados y normalización de los datos.                               |
| `vue-sonner`    | Toasts de éxito y de errores remotos.                                        |
| `shadcn-vue`    | Componentes `Field`, `FieldError`, `Input` y `Button`.                       |

```bash
pnpm add @formisch/vue valibot
```

## Arquitectura

```text
Input de shadcn-vue
        │
        ▼
FormischField ── estado, envío y errores ──► Formisch <Form>
        │                                         │
        ▼                                         ▼
Field / FieldError ◄──── resultados ◄──── esquema Valibot
        │
        └── operaciones remotas: setErrors + toast
```

Las piezas compartidas están aquí:

| Ubicación                                | Contenido                                                                            |
| ---------------------------------------- | ------------------------------------------------------------------------------------ |
| `src/schemas/auth-forms.schema.ts`       | Esquemas de inicio de sesión, registro, recuperación, cambio de correo y contraseña. |
| `src/schemas/profile-settings.schema.ts` | Esquema del nombre de perfil.                                                        |
| `src/utils/formisch-input.ts`            | Adaptador que evita registrar como referencia la instancia Vue de `Input`.           |
| `src/components/ui/input/Input.vue`      | Acepta `inputRef` y la conecta con el `<input>` nativo.                              |
| `tests/formisch-input.spec.ts`           | Prueba de la referencia nativa para el enfoque automático de Formisch.               |

## Ciclo de un formulario

1. Se crea un esquema Valibot, con los mensajes ya traducidos.
2. `useForm` recibe el esquema con `validate: 'submit'` y `revalidate: 'input'`.
3. Cada `FormischField` vincula un control mediante `v-model` y las propiedades de Formisch.
4. Al enviar, Formisch valida y solo llama al `SubmitHandler` cuando el esquema es válido.
5. La operación remota limpia primero los errores raíz, y después muestra éxito o registra el error remoto.
6. Un error de esquema se muestra junto al campo; un error remoto se muestra en el formulario y en un toast.

## Patrón de componente

Usar este patrón para cada campo de texto que se conecte a Formisch:

```vue
<script setup lang="ts">
import { Field as FormischField, Form, setErrors, useForm } from '@formisch/vue'
import type { SubmitHandler } from '@formisch/vue'
import { useI18n } from 'vue-i18n'

import { createLoginSchema } from '@/schemas/auth-forms.schema'
import { getFormischInputProps } from '@/utils/formisch-input'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

const { t } = useI18n()

const schema = createLoginSchema({
  emailRequired: t('errors.emailRequired'),
  invalidEmail: t('errors.invalidEmail'),
  passwordRequired: t('errors.passwordRequired'),
})

const form = useForm({
  schema,
  validate: 'submit',
  revalidate: 'input',
})

const handleSubmit: SubmitHandler<typeof schema> = async (values) => {
  setErrors(form, { errors: null })
  // Ejecutar la operación remota con `values`.
}
</script>

<template>
  <Form :of="form" @submit="handleSubmit">
    <FieldGroup>
      <FormischField :of="form" :path="['email']" v-slot="formField">
        <Field :data-invalid="formField.errors !== null">
          <FieldLabel for="email">{{ t('common.email') }}</FieldLabel>
          <Input id="email" v-model="formField.input" v-bind="getFormischInputProps(formField.props)" :input-ref="formField.props.ref" :aria-invalid="formField.errors !== null" type="email" autocomplete="email" />
          <FieldError v-if="formField.errors" :errors="formField.errors" />
        </Field>
      </FormischField>

      <FieldError v-if="form.errors" :errors="form.errors" />
    </FieldGroup>
  </Form>
</template>
```

### Referencias de `Input`

La guía de shadcn-vue para Formisch conecta el control mediante `v-bind="field.props"`. En esta aplicación, `Input` es un componente Vue que envuelve al elemento HTML; si `ref` se pasa directamente, Formisch registra la instancia del componente, no el `<input>`.

Eso impide el enfoque automático y provoca `element.focus is not a function`. Por ello, **no usar** `v-bind="formField.props"` directamente sobre `Input`. Usar siempre:

```vue
v-bind="getFormischInputProps(formField.props)" :input-ref="formField.props.ref"
```

El primer enlace excluye `ref`; el segundo lo reenvía al `<input>` nativo. Este adaptador es necesario en cualquier componente de control que envuelva un elemento HTML.

## Esquemas Valibot

Los esquemas se agrupan por dominio y se construyen mediante fábricas para recibir mensajes de `vue-i18n`. Esto evita fijar los textos de validación en el propio esquema.

```ts
const EmailSchema = v.pipe(v.string(), v.trim(), v.nonEmpty(messages.emailRequired), v.email(messages.invalidEmail))
```

Reglas actuales:

- Los emails se recortan antes de enviarse y se validan como obligatorios y con formato correcto.
- El nombre de perfil se recorta y admite hasta 80 caracteres.
- Registro y cambio de contraseña validan confirmación mediante `v.partialCheck` y `v.forward`.
- El cambio de correo valida que el nuevo correo no sea el actual.
- La política de contraseñas de Firebase se mantiene como comprobación asíncrona: no forma parte del esquema y se asigna al campo con `setErrors`.

## Errores y toasts

| Caso                                             | Presentación                                                     | Toast                         |
| ------------------------------------------------ | ---------------------------------------------------------------- | ----------------------------- |
| Validación síncrona de Valibot                   | `FieldError` junto al campo inválido.                            | No.                           |
| Política asíncrona de contraseña                 | Error asignado al campo con `setErrors(form, { path, errors })`. | No.                           |
| Error remoto o de Firebase                       | Error raíz con `setErrors(form, { errors: [mensaje] })`.         | Sí, `toast.error(mensaje)`.   |
| Operación satisfactoria sin navegación inmediata | —                                                                | Sí, `toast.success(mensaje)`. |

Antes de una operación remota se limpian los errores raíz:

```ts
setErrors(form, { errors: null })

const succeeded = await operation()
if (!succeeded) {
  const message = store.error ?? t('errors.operationFailed')
  setErrors(form, { errors: [message] })
  toast.error(message)
}
```

Los errores de un campo se indican además con `data-invalid` en `Field` y `aria-invalid` en el control. No se debe usar toast para duplicar una validación local; los toasts están reservados para resultados de operaciones remotas o éxitos relevantes.

## Añadir un formulario

1. Añadir o ampliar una fábrica de esquema en `src/schemas/`.
2. Incluir los mensajes de validación necesarios en `src/locales/en.json` y `src/locales/es.json`.
3. Crear `schema` y `form` con `useForm` en el componente.
4. Usar `Form`, `FormischField`, `Field`, `FieldError` y el puente `getFormischInputProps`/`input-ref`.
5. Tipar el envío como `SubmitHandler<typeof schema>`.
6. Mantener las validaciones remotas o asíncronas fuera del esquema y reflejarlas con `setErrors`.
7. Añadir toasts solo según la tabla anterior.
8. Ejecutar las verificaciones:

```bash
pnpm run type-check
pnpm run test:unit
pnpm exec prettier --check docs/validation/README.md
```

## Referencias

- [Formisch en shadcn-vue](https://www.shadcn-vue.com/docs/forms/formisch)
- [Formisch para Vue](https://formisch.dev/)
- [Valibot](https://valibot.dev/)
