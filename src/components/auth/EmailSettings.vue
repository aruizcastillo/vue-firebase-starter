<script setup lang="ts">
import { Field as FormischField, Form, setErrors, setInput, useForm } from '@formisch/vue'
import type { SubmitHandler } from '@formisch/vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

import { createEmailChangeSchema } from '@/schemas/auth-forms.schema'
import { authServiceErrorCodes, requestEmailChange } from '@/services/auth.service'
import { useAuthStore } from '@/stores/auth.store'
import { getAuthErrorMessage } from '@/utils/auth-errors'
import { getFormischInputProps } from '@/utils/formisch-input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

const authStore = useAuthStore()
const { t } = useI18n()
const loading = ref(false)
const emailPasswordProvider = computed(() => authStore.user?.providerData.some((provider) => provider.providerId === 'password') ?? false)
const emailChangeSchema = createEmailChangeSchema(
  {
    emailRequired: t('errors.newEmailRequired'),
    invalidEmail: t('errors.invalidEmail'),
    currentPasswordRequired: t('errors.passwordConfirmationRequired'),
    newEmailUnchanged: t('errors.newEmailUnchanged'),
  },
  authStore.user?.email ?? null,
  emailPasswordProvider.value,
)
const form = useForm({
  schema: emailChangeSchema,
  validate: 'submit',
  revalidate: 'input',
})

const handleEmailChange: SubmitHandler<typeof emailChangeSchema> = async ({ newEmail, currentPassword }) => {
  setErrors(form, { errors: null })
  const user = authStore.user
  if (!user) {
    showError(t('errors.noAuthenticatedUser'))
    return
  }

  loading.value = true
  try {
    await requestEmailChange(user, newEmail, currentPassword)
    setInput(form, { path: ['currentPassword'], input: '' })
    toast.success(t('account.emailSent'))
  } catch (caughtError) {
    showError(getEmailChangeErrorMessage(caughtError))
  } finally {
    loading.value = false
  }
}

async function refreshVerifiedEmail(): Promise<void> {
  const user = authStore.user
  if (!user) return
  setErrors(form, { errors: null })
  loading.value = true
  try {
    if (!(await authStore.refreshUser())) {
      showError(authStore.operationError ?? t('errors.operationFailed'))
      return
    }
    toast.success(t('account.emailRefreshed'))
  } catch (caughtError) {
    showError(getAuthErrorMessage(caughtError))
  } finally {
    loading.value = false
  }
}

function getEmailChangeErrorMessage(caughtError: unknown): string {
  if (caughtError instanceof Error && caughtError.message === authServiceErrorCodes.passwordConfirmationRequired) {
    return t('errors.passwordConfirmationRequired')
  }

  if (caughtError instanceof Error && caughtError.message === authServiceErrorCodes.emailChangeUnavailable) {
    return t('errors.emailChangeUnavailable')
  }

  return getAuthErrorMessage(caughtError)
}

function showError(errorMessage: string): void {
  setErrors(form, { errors: [errorMessage] })
  toast.error(errorMessage)
}
</script>

<template>
  <Card aria-labelledby="change-email-heading">
    <CardHeader class="flex flex-col">
      <CardTitle id="change-email-heading" class="text-xl font-bold">{{ t('account.changeEmail') }}</CardTitle>
      <CardDescription>{{ t('account.emailIntro') }}</CardDescription>
      <CardDescription>
        {{ emailPasswordProvider ? t('account.emailPasswordHint') : t('account.emailGoogleHint') }}
      </CardDescription>
      <CardDescription>{{ t('account.spamHint') }}</CardDescription>
    </CardHeader>
    <CardContent>
      <Form id="change-email-form" :of="form" @submit="handleEmailChange">
        <FieldGroup class="grid w-full items-center gap-4">
          <FormischField :of="form" :path="['newEmail']" v-slot="formField">
            <Field class="flex flex-col" :data-invalid="Boolean(formField.errors)">
              <FieldLabel for="new-email">{{ t('account.newEmail') }}</FieldLabel>
              <Input id="new-email" v-model="formField.input" v-bind="getFormischInputProps(formField.props)" :input-ref="formField.props.ref" :aria-invalid="formField.errors ? true : undefined" type="email" autocomplete="email" />
              <FieldError v-if="formField.errors" :errors="formField.errors" class="form-error" />
            </Field>
          </FormischField>
          <FormischField v-if="emailPasswordProvider" :of="form" :path="['currentPassword']" v-slot="formField">
            <Field class="flex flex-col" :data-invalid="Boolean(formField.errors)">
              <FieldLabel for="current-password">{{ t('common.currentPassword') }}</FieldLabel>
              <Input id="current-password" v-model="formField.input" v-bind="getFormischInputProps(formField.props)" :input-ref="formField.props.ref" :aria-invalid="formField.errors ? true : undefined" type="password" autocomplete="current-password" />
              <FieldError v-if="formField.errors" :errors="formField.errors" class="form-error" />
            </Field>
          </FormischField>
          <FieldError v-if="form.errors" :errors="form.errors" class="form-error" />
        </FieldGroup>
      </Form>
    </CardContent>
    <CardFooter class="flex flex-col gap-2">
      <Button form="change-email-form" type="submit" class="w-full" :disabled="loading">
        <Spinner v-if="loading" data-icon="inline-start" />
        {{ loading ? t('buttons.requesting') : t('buttons.sendVerificationLink') }}
      </Button>
      <Button type="button" variant="outline" class="w-full" :disabled="loading" @click="refreshVerifiedEmail">
        {{ t('buttons.verifiedEmail') }}
      </Button>
    </CardFooter>
  </Card>
</template>
