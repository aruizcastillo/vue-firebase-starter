<script setup lang="ts">
import { Field as FormischField, Form, reset, setErrors, useForm } from '@formisch/vue'
import type { SubmitHandler } from '@formisch/vue'
import { onBeforeMount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

import { createPasswordChangeSchema } from '@/schemas/auth-forms.schema'
import { changePassword, checkPasswordAgainstPolicy } from '@/services/auth.service'
import { useAuthStore } from '@/stores/auth.store'
import { getAuthErrorMessage } from '@/utils/auth-errors'
import { getFormischInputProps } from '@/utils/formisch-input'
import { getPasswordPolicyMessage } from '@/utils/password-policy'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

const authStore = useAuthStore()
const { t } = useI18n()
const loading = ref(false)
const policyMessage = ref<string | null>(null)
const passwordChangeSchema = createPasswordChangeSchema({
  passwordRequired: t('errors.newPasswordRequired'),
  passwordsDoNotMatch: t('errors.newPasswordConfirmation'),
  newPasswordUnchanged: t('errors.newPasswordUnchanged'),
})
const form = useForm({
  schema: passwordChangeSchema,
  validate: 'submit',
  revalidate: 'input',
})

onBeforeMount(() => {
  void loadPasswordPolicy()
})

async function loadPasswordPolicy(): Promise<void> {
  try {
    const validation = await checkPasswordAgainstPolicy('')
    policyMessage.value = validation.isValid ? null : getPasswordPolicyMessage(validation)
  } catch {
    policyMessage.value = null
  }
}

const handlePasswordChange: SubmitHandler<typeof passwordChangeSchema> = async ({ passwordCurrent, passwordNew }) => {
  const user = authStore.user
  setErrors(form, { errors: null })
  if (!user) {
    showError(t('errors.noAuthenticatedUser'))
    return
  }

  loading.value = true
  try {
    const validation = await checkPasswordAgainstPolicy(passwordNew)
    if (!validation.isValid) {
      setErrors(form, { path: ['passwordNew'], errors: [getPasswordPolicyMessage(validation)] })
      return
    }
    await changePassword(user, passwordCurrent, passwordNew)
    reset(form)
    toast.success(t('account.passwordChanged'))
  } catch (caughtError) {
    showError(getAuthErrorMessage(caughtError))
  } finally {
    loading.value = false
  }
}

function showError(errorMessage: string): void {
  setErrors(form, { errors: [errorMessage] })
  toast.error(errorMessage)
}
</script>

<template>
  <Card aria-labelledby="change-password-heading">
    <CardHeader class="flex flex-col">
      <CardTitle id="change-password-heading" class="text-xl font-bold">{{ t('account.changePassword') }}</CardTitle>
      <CardDescription>{{ t('account.changePasswordIntro') }}</CardDescription>
      <CardDescription>{{ t('account.passwordSecurityHint') }}</CardDescription>
      <CardDescription v-if="policyMessage">{{ policyMessage }}</CardDescription>
    </CardHeader>
    <CardContent>
      <Form id="change-password-form" :of="form" @submit="handlePasswordChange">
        <FieldGroup class="grid w-full items-center gap-4">
          <FormischField :of="form" :path="['passwordCurrent']" v-slot="formField">
            <Field class="flex flex-col" :data-invalid="Boolean(formField.errors)">
              <FieldLabel for="password-current">{{ t('common.currentPassword') }}</FieldLabel>
              <Input id="password-current" v-model="formField.input" v-bind="getFormischInputProps(formField.props)" :input-ref="formField.props.ref" :aria-invalid="formField.errors ? true : undefined" type="password" autocomplete="current-password" />
              <FieldError v-if="formField.errors" :errors="formField.errors" class="form-error" />
            </Field>
          </FormischField>
          <FormischField :of="form" :path="['passwordNew']" v-slot="formField">
            <Field class="flex flex-col" :data-invalid="Boolean(formField.errors)">
              <FieldLabel for="password-new">{{ t('common.newPassword') }}</FieldLabel>
              <Input id="password-new" v-model="formField.input" v-bind="getFormischInputProps(formField.props)" :input-ref="formField.props.ref" :aria-invalid="formField.errors ? true : undefined" type="password" autocomplete="new-password" />
              <FieldError v-if="formField.errors" :errors="formField.errors" class="form-error" />
            </Field>
          </FormischField>
          <FormischField :of="form" :path="['passwordConfirmation']" v-slot="formField">
            <Field class="flex flex-col" :data-invalid="Boolean(formField.errors)">
              <FieldLabel for="password-confirmation">{{ t('common.confirmNewPassword') }}</FieldLabel>
              <Input id="password-confirmation" v-model="formField.input" v-bind="getFormischInputProps(formField.props)" :input-ref="formField.props.ref" :aria-invalid="formField.errors ? true : undefined" type="password" autocomplete="new-password" />
              <FieldError v-if="formField.errors" :errors="formField.errors" class="form-error" />
            </Field>
          </FormischField>
          <FieldError v-if="form.errors" :errors="form.errors" class="form-error" />
        </FieldGroup>
      </Form>
    </CardContent>
    <CardFooter class="flex flex-col gap-2">
      <Button form="change-password-form" type="submit" class="w-full" :disabled="loading">
        <Spinner v-if="loading" data-icon="inline-start" />
        {{ loading ? t('buttons.changing') : t('buttons.changePassword') }}
      </Button>
    </CardFooter>
  </Card>
</template>
