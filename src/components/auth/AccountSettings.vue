<script setup lang="ts">
import { Field as FormischField, Form, reset, setErrors, setInput, useForm } from '@formisch/vue'
import type { SubmitHandler } from '@formisch/vue'
import { computed, onBeforeMount, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { authConfig } from '@/config/auth.config'
import { authServiceErrorCodes, changePassword, checkPasswordAgainstPolicy, requestEmailChange } from '@/services/auth.service'
import { useAuthStore } from '@/stores/auth.store'
import { useProfileStore } from '@/stores/profile.store'
import { getAuthErrorMessage } from '@/utils/auth-errors'
import { getFormischInputProps } from '@/utils/formisch-input'
import { getPasswordPolicyMessage } from '@/utils/password-policy'
import { createEmailChangeSchema, createPasswordChangeSchema } from '@/schemas/auth-forms.schema'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'vue-sonner'

const authStore = useAuthStore()
const profileStore = useProfileStore()
const { t } = useI18n()
const emailChangeLoading = ref(false)
const passwordChangeLoading = ref(false)
const passwordPolicyMessage = ref<string | null>(null)
const deactivationError = ref<string | null>(null)
const deactivating = ref(false)
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
const emailChangeForm = useForm({
  schema: emailChangeSchema,
  validate: 'submit',
  revalidate: 'input',
})
const passwordChangeSchema = createPasswordChangeSchema({
  passwordRequired: t('errors.newPasswordRequired'),
  passwordsDoNotMatch: t('errors.newPasswordConfirmation'),
  newPasswordUnchanged: t('errors.newPasswordUnchanged'),
})
const passwordChangeForm = useForm({
  schema: passwordChangeSchema,
  validate: 'submit',
  revalidate: 'input',
})

onBeforeMount(() => {
  if (emailPasswordProvider.value) void loadPasswordPolicy()
})

async function loadPasswordPolicy(): Promise<void> {
  try {
    const validation = await checkPasswordAgainstPolicy('')
    passwordPolicyMessage.value = validation.isValid ? null : getPasswordPolicyMessage(validation)
  } catch {
    passwordPolicyMessage.value = null
  }
}

const handleEmailChange: SubmitHandler<typeof emailChangeSchema> = async ({ newEmail, currentPassword }) => {
  setErrors(emailChangeForm, { errors: null })
  const user = authStore.user
  if (!user) {
    showEmailChangeError(t('errors.noAuthenticatedUser'))
    return
  }

  emailChangeLoading.value = true
  try {
    await requestEmailChange(user, newEmail, currentPassword)
    setInput(emailChangeForm, { path: ['currentPassword'], input: '' })
    toast.success(t('account.emailSent'))
  } catch (caughtError) {
    showEmailChangeError(getEmailChangeErrorMessage(caughtError))
  } finally {
    emailChangeLoading.value = false
  }
}

async function refreshVerifiedEmail(): Promise<void> {
  const user = authStore.user
  if (!user) return
  setErrors(emailChangeForm, { errors: null })
  emailChangeLoading.value = true
  try {
    if (!(await authStore.refreshUser())) {
      showEmailChangeError(authStore.error ?? t('errors.operationFailed'))
      return
    }
    toast.success(t('account.emailRefreshed'))
  } catch (caughtError) {
    showEmailChangeError(getAuthErrorMessage(caughtError))
  } finally {
    emailChangeLoading.value = false
  }
}

const handlePasswordChange: SubmitHandler<typeof passwordChangeSchema> = async ({ passwordCurrent, passwordNew }) => {
  const user = authStore.user
  setErrors(passwordChangeForm, { errors: null })
  if (!user) {
    showPasswordChangeError(t('errors.noAuthenticatedUser'))
    return
  }

  passwordChangeLoading.value = true
  try {
    const validation = await checkPasswordAgainstPolicy(passwordNew)
    if (!validation.isValid) {
      setErrors(passwordChangeForm, { path: ['passwordNew'], errors: [getPasswordPolicyMessage(validation)] })
      return
    }
    await changePassword(user, passwordCurrent, passwordNew)
    reset(passwordChangeForm)
    toast.success(t('account.passwordChanged'))
  } catch (caughtError) {
    showPasswordChangeError(getAuthErrorMessage(caughtError))
  } finally {
    passwordChangeLoading.value = false
  }
}

async function handleDeactivation(): Promise<void> {
  if (!authStore.user || !window.confirm(t('account.deactivateConfirm'))) return
  deactivationError.value = null
  deactivating.value = true
  const succeeded = await profileStore.updateStatus(authStore.user, 'deactivated')
  if (succeeded) {
    await authStore.signOut()
  } else {
    deactivationError.value = profileStore.operationError ?? t('errors.accountDeactivationFailed')
    toast.error(deactivationError.value)
  }
  deactivating.value = false
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

function showEmailChangeError(errorMessage: string): void {
  setErrors(emailChangeForm, { errors: [errorMessage] })
  toast.error(errorMessage)
}

function showPasswordChangeError(errorMessage: string): void {
  setErrors(passwordChangeForm, { errors: [errorMessage] })
  toast.error(errorMessage)
}
</script>

<template>
  <div class="flex flex-col gap-md">
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
        <Form id="change-email-form" :of="emailChangeForm" @submit="handleEmailChange">
          <FieldGroup class="grid w-full items-center gap-4">
            <FormischField :of="emailChangeForm" :path="['newEmail']" v-slot="formField">
              <Field class="flex flex-col" :data-invalid="Boolean(formField.errors)">
                <FieldLabel for="new-email">{{ t('account.newEmail') }}</FieldLabel>
                <Input id="new-email" v-model="formField.input" v-bind="getFormischInputProps(formField.props)" :input-ref="formField.props.ref" :aria-invalid="formField.errors ? true : undefined" type="email" autocomplete="email" />
                <FieldError v-if="formField.errors" :errors="formField.errors" class="form-error" />
              </Field>
            </FormischField>
            <FormischField v-if="emailPasswordProvider" :of="emailChangeForm" :path="['currentPassword']" v-slot="formField">
              <Field class="flex flex-col" :data-invalid="Boolean(formField.errors)">
                <FieldLabel for="current-password">{{ t('common.currentPassword') }}</FieldLabel>
                <Input id="current-password" v-model="formField.input" v-bind="getFormischInputProps(formField.props)" :input-ref="formField.props.ref" :aria-invalid="formField.errors ? true : undefined" type="password" autocomplete="current-password" />
                <FieldError v-if="formField.errors" :errors="formField.errors" class="form-error" />
              </Field>
            </FormischField>
            <FieldError v-if="emailChangeForm.errors" :errors="emailChangeForm.errors" class="form-error" />
          </FieldGroup>
        </Form>
      </CardContent>
      <CardFooter class="flex flex-col gap-2">
        <Button form="change-email-form" type="submit" class="w-full" :disabled="emailChangeLoading">
          <Spinner v-if="emailChangeLoading" data-icon="inline-start" />
          {{ emailChangeLoading ? t('buttons.requesting') : t('buttons.sendVerificationLink') }}
        </Button>
        <Button type="button" variant="outline" class="w-full" :disabled="emailChangeLoading" @click="refreshVerifiedEmail">
          {{ t('buttons.verifiedEmail') }}
        </Button>
      </CardFooter>
    </Card>

    <Card v-if="emailPasswordProvider" aria-labelledby="change-password-heading">
      <CardHeader class="flex flex-col">
        <CardTitle id="change-password-heading" class="text-xl font-bold">{{ t('account.changePassword') }}</CardTitle>
        <CardDescription>{{ t('account.changePasswordIntro') }}</CardDescription>
        <CardDescription>{{ t('account.passwordSecurityHint') }}</CardDescription>
        <CardDescription v-if="passwordPolicyMessage">{{ passwordPolicyMessage }}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form id="change-password-form" :of="passwordChangeForm" @submit="handlePasswordChange">
          <FieldGroup class="grid w-full items-center gap-4">
            <FormischField :of="passwordChangeForm" :path="['passwordCurrent']" v-slot="formField">
              <Field class="flex flex-col" :data-invalid="Boolean(formField.errors)">
                <FieldLabel for="password-current">{{ t('common.currentPassword') }}</FieldLabel>
                <Input id="password-current" v-model="formField.input" v-bind="getFormischInputProps(formField.props)" :input-ref="formField.props.ref" :aria-invalid="formField.errors ? true : undefined" type="password" autocomplete="current-password" />
                <FieldError v-if="formField.errors" :errors="formField.errors" class="form-error" />
              </Field>
            </FormischField>
            <FormischField :of="passwordChangeForm" :path="['passwordNew']" v-slot="formField">
              <Field class="flex flex-col" :data-invalid="Boolean(formField.errors)">
                <FieldLabel for="password-new">{{ t('common.newPassword') }}</FieldLabel>
                <Input id="password-new" v-model="formField.input" v-bind="getFormischInputProps(formField.props)" :input-ref="formField.props.ref" :aria-invalid="formField.errors ? true : undefined" type="password" autocomplete="new-password" />
                <FieldError v-if="formField.errors" :errors="formField.errors" class="form-error" />
              </Field>
            </FormischField>
            <FormischField :of="passwordChangeForm" :path="['passwordConfirmation']" v-slot="formField">
              <Field class="flex flex-col" :data-invalid="Boolean(formField.errors)">
                <FieldLabel for="password-confirmation">{{ t('common.confirmNewPassword') }}</FieldLabel>
                <Input id="password-confirmation" v-model="formField.input" v-bind="getFormischInputProps(formField.props)" :input-ref="formField.props.ref" :aria-invalid="formField.errors ? true : undefined" type="password" autocomplete="new-password" />
                <FieldError v-if="formField.errors" :errors="formField.errors" class="form-error" />
              </Field>
            </FormischField>
            <FieldError v-if="passwordChangeForm.errors" :errors="passwordChangeForm.errors" class="form-error" />
          </FieldGroup>
        </Form>
      </CardContent>
      <CardFooter class="flex flex-col gap-2">
        <Button form="change-password-form" type="submit" class="w-full" :disabled="passwordChangeLoading">
          <Spinner v-if="passwordChangeLoading" data-icon="inline-start" />
          {{ passwordChangeLoading ? t('buttons.changing') : t('buttons.changePassword') }}
        </Button>
      </CardFooter>
    </Card>

    <Card v-if="authConfig.requiresAccountStatus" aria-labelledby="deactivate-account-heading" class="border-destructive">
      <CardHeader class="flex flex-col">
        <CardTitle id="deactivate-account-heading" class="text-xl font-bold">{{ t('account.deactivate') }}</CardTitle>
        <CardDescription>{{ t('account.deactivateIntro') }}</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-2">
        <FieldError v-if="deactivationError" class="form-error">{{ deactivationError }}</FieldError>
        <Button type="button" variant="destructive" class="w-full" :disabled="deactivating || profileStore.loading" @click="handleDeactivation">
          <Spinner v-if="deactivating" data-icon="inline-start" />
          {{ deactivating ? t('buttons.deactivating') : t('buttons.deactivateAccount') }}
        </Button>
      </CardContent>
    </Card>
  </div>
</template>
