<script setup lang="ts">
import { Field as FormischField, Form, setErrors, useForm } from '@formisch/vue'
import type { SubmitHandler } from '@formisch/vue'
import { computed, onBeforeMount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

import { useAuthStore } from '@/stores/auth.store'
import { getPasswordPolicyMessage } from '@/utils/password-policy'
import { createRegistrationSchema } from '@/schemas/auth-forms.schema'
import { getFormischInputProps } from '@/utils/formisch-input'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'vue-sonner'

const emit = defineEmits<{
  success: []
}>()

const authStore = useAuthStore()
const { t } = useI18n()

const passwordPolicyMessage = ref<string | null>(null)
const registerSchema = createRegistrationSchema({
  emailRequired: t('errors.emailRequired'),
  invalidEmail: t('errors.invalidEmail'),
  passwordRequired: t('errors.passwordRequired'),
  passwordsDoNotMatch: t('auth.passwordsDoNotMatch'),
})
const registerForm = useForm({
  schema: registerSchema,
  validate: 'submit',
  revalidate: 'input',
})
const checkingPassword = computed(() => authStore.operationLoading)
const creatingAccount = computed(() => authStore.authStatus === 'authenticating')
const submitting = computed(() => checkingPassword.value || creatingAccount.value)

onBeforeMount(() => {
  void loadPasswordPolicy()
})

async function loadPasswordPolicy(): Promise<void> {
  const passwordStatus = await authStore.validateRegistrationPassword('')

  if (passwordStatus && !passwordStatus.isValid) {
    passwordPolicyMessage.value = getPasswordPolicyMessage(passwordStatus)
  }
}

const handleSubmit: SubmitHandler<typeof registerSchema> = async ({ email, password }) => {
  setErrors(registerForm, { errors: null })
  authStore.clearError()

  const passwordStatus = await authStore.validateRegistrationPassword(password)

  if (!passwordStatus) {
    showAuthError()
    return
  }

  if (!passwordStatus.isValid) {
    setErrors(registerForm, { path: ['password'], errors: [getPasswordPolicyMessage(passwordStatus)] })
    return
  }

  const succeeded = await authStore.register(email, password)

  if (succeeded) {
    emit('success')
    return
  }

  showAuthError()
}

async function handleGoogleRegistration(): Promise<void> {
  setErrors(registerForm, { errors: null })
  authStore.clearError()

  const succeeded = await authStore.googleLogin()

  if (succeeded) {
    emit('success')
    return
  }

  showAuthError()
}

function showAuthError(): void {
  const errorMessage = authStore.operationError ?? t('errors.operationFailed')
  setErrors(registerForm, { errors: [errorMessage] })
  toast.error(errorMessage)
}
</script>

<template>
  <Card>
    <CardHeader class="flex flex-col">
      <CardTitle class="text-xl font-bold">{{ t('navigation.signUp') }}</CardTitle>
      <CardDescription class="text-muted-foreground font-">
        {{ t('auth.registerDescription') }}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <Form id="register-form" :of="registerForm" @submit="handleSubmit">
        <FieldGroup class="grid w-full items-center gap-4">
          <FormischField :of="registerForm" :path="['email']" v-slot="formField">
            <Field class="flex flex-col" :data-invalid="Boolean(formField.errors)">
              <FieldLabel for="register-email">{{ t('common.email') }}</FieldLabel>
              <Input id="register-email" v-model="formField.input" v-bind="getFormischInputProps(formField.props)" :input-ref="formField.props.ref" :aria-invalid="formField.errors ? true : undefined" type="email" autocomplete="email" />
              <FieldError v-if="formField.errors" :errors="formField.errors" class="form-error" />
            </Field>
          </FormischField>
          <FormischField :of="registerForm" :path="['password']" v-slot="formField">
            <Field class="flex flex-col" :data-invalid="Boolean(formField.errors)">
              <FieldLabel for="register-password">{{ t('common.password') }}</FieldLabel>
              <Input id="register-password" v-model="formField.input" v-bind="getFormischInputProps(formField.props)" :input-ref="formField.props.ref" :aria-invalid="formField.errors ? true : undefined" type="password" autocomplete="new-password" />
              <FieldError v-if="formField.errors" :errors="formField.errors" class="form-error" />
            </Field>
          </FormischField>
          <FormischField :of="registerForm" :path="['confirmPassword']" v-slot="formField">
            <Field class="flex flex-col" :data-invalid="Boolean(formField.errors)">
              <FieldLabel for="confirm-password">{{ t('common.confirmNewPassword') }}</FieldLabel>
              <Input id="confirm-password" v-model="formField.input" v-bind="getFormischInputProps(formField.props)" :input-ref="formField.props.ref" :aria-invalid="formField.errors ? true : undefined" type="password" autocomplete="new-password" />
              <FieldError v-if="formField.errors" :errors="formField.errors" class="form-error" />
            </Field>
          </FormischField>
          <FieldError v-if="registerForm.errors" :errors="registerForm.errors" class="form-error" />
        </FieldGroup>
      </Form>
    </CardContent>
    <CardFooter class="flex flex-col gap-2">
      <Button form="register-form" type="submit" class="w-full" :disabled="submitting">
        <Spinner v-if="creatingAccount" data-icon="inline-start" />
        {{ checkingPassword ? t('buttons.checkingPassword') : creatingAccount ? t('buttons.creatingAccount') : t('navigation.createAccount') }}
      </Button>
      <Button type="button" variant="outline" class="w-full" :disabled="submitting" @click="handleGoogleRegistration">
        {{ t('buttons.continueWithGoogle') }}
      </Button>
      <CardAction class="pt-2 self-end">
        <RouterLink to="/login" class="link-muted text-sm">{{ $t('navigation.alreadyHaveAccount') }}</RouterLink>
      </CardAction>
    </CardFooter>
  </Card>
</template>
