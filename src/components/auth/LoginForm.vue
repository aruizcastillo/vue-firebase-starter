<script setup lang="ts">
import { Field as FormischField, Form, setErrors, useForm } from '@formisch/vue'
import type { SubmitHandler } from '@formisch/vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

import { useAuthStore } from '@/stores/auth.store'
import { createLoginSchema } from '@/schemas/auth-forms.schema'
import { getFormischInputProps } from '@/utils/formisch-input'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'vue-sonner'

const emit = defineEmits<{ success: [] }>()
const authStore = useAuthStore()
const { t } = useI18n()
const loginSchema = createLoginSchema({
  emailRequired: t('errors.emailRequired'),
  invalidEmail: t('errors.invalidEmail'),
  passwordRequired: t('errors.passwordRequired'),
})
const loginForm = useForm({
  schema: loginSchema,
  validate: 'submit',
  revalidate: 'input',
})

const handleSubmit: SubmitHandler<typeof loginSchema> = async ({ email, password }) => {
  setErrors(loginForm, { errors: null })

  if (await authStore.login(email, password)) {
    emit('success')
    return
  }

  showAuthError()
}

async function handleGoogleLogin(): Promise<void> {
  setErrors(loginForm, { errors: null })

  if (await authStore.googleLogin()) {
    emit('success')
    return
  }

  showAuthError()
}

function showAuthError(): void {
  const errorMessage = authStore.operationError ?? t('errors.operationFailed')
  setErrors(loginForm, { errors: [errorMessage] })
  toast.error(errorMessage)
}
</script>

<template>
  <Card>
    <CardHeader class="flex flex-col">
      <CardTitle class="text-xl font-bold">{{ t('navigation.login') }}</CardTitle>
      <CardDescription>
        {{ t('auth.loginDescription') }}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <Form id="login-form" :of="loginForm" @submit="handleSubmit">
        <FieldGroup class="grid w-full items-center gap-4">
          <FormischField :of="loginForm" :path="['email']" v-slot="formField">
            <Field class="flex flex-col" :data-invalid="Boolean(formField.errors)">
              <FieldLabel for="login-email">{{ t('common.email') }}</FieldLabel>
              <Input id="login-email" v-model="formField.input" v-bind="getFormischInputProps(formField.props)" :input-ref="formField.props.ref" :aria-invalid="formField.errors ? true : undefined" type="email" autocomplete="email" />
              <FieldError v-if="formField.errors" :errors="formField.errors" class="form-error" />
            </Field>
          </FormischField>
          <FormischField :of="loginForm" :path="['password']" v-slot="formField">
            <Field class="flex flex-col" :data-invalid="Boolean(formField.errors)">
              <div class="flex items-center justify-between">
                <FieldLabel for="login-password">{{ t('common.password') }}</FieldLabel>
                <RouterLink to="/forgot-password" class="link-muted text-sm">
                  {{ t('navigation.forgotPassword') }}
                </RouterLink>
              </div>
              <Input id="login-password" v-model="formField.input" v-bind="getFormischInputProps(formField.props)" :input-ref="formField.props.ref" :aria-invalid="formField.errors ? true : undefined" type="password" autocomplete="current-password" />
              <FieldError v-if="formField.errors" :errors="formField.errors" class="form-error" />
            </Field>
          </FormischField>
          <FieldError v-if="loginForm.errors" :errors="loginForm.errors" class="form-error" />
        </FieldGroup>
      </Form>
    </CardContent>
    <CardFooter class="flex flex-col gap-2">
      <Button form="login-form" type="submit" class="w-full" :disabled="authStore.authStatus === 'authenticating'">
        <Spinner v-if="authStore.authStatus === 'authenticating'" data-icon="inline-start" />
        {{ authStore.authStatus === 'authenticating' ? t('buttons.loggingIn') : t('buttons.login') }}
      </Button>
      <Button type="button" variant="outline" class="w-full" :disabled="authStore.authStatus === 'authenticating'" @click="handleGoogleLogin">
        {{ t('buttons.continueWithGoogle') }}
      </Button>
      <CardAction class="pt-2 self-end">
        <RouterLink to="/register" class="link-muted text-sm">{{ t('navigation.signUp') }}</RouterLink>
      </CardAction>
    </CardFooter>
  </Card>
</template>
