<script setup lang="ts">
import { computed, onBeforeMount, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { authServiceErrorCodes, changePassword, checkPasswordAgainstPolicy, reloadAuthenticatedUser, requestEmailChange } from '@/services/auth.service'
import { useAuthStore } from '@/stores/auth.store'
import { useProfileStore } from '@/stores/profile.store'
import { getAuthErrorMessage } from '@/utils/auth-errors'
import { getPasswordPolicyMessage } from '@/utils/password-policy'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'

const authStore = useAuthStore()
const profileStore = useProfileStore()
const { t } = useI18n()
const newEmail = ref('')
const currentPassword = ref('')
const emailChangeMessage = ref<string | null>(null)
const emailChangeError = ref<string | null>(null)
const emailChangeLoading = ref(false)
const passwordCurrent = ref('')
const passwordNew = ref('')
const passwordConfirmation = ref('')
const passwordChangeError = ref<string | null>(null)
const passwordChangeMessage = ref<string | null>(null)
const passwordChangeLoading = ref(false)
const passwordPolicyMessage = ref<string | null>(null)
const deactivationError = ref<string | null>(null)
const deactivating = ref(false)
const emailPasswordProvider = computed(() => authStore.user?.providerData.some((provider) => provider.providerId === 'password') ?? false)

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

async function handleEmailChange(): Promise<void> {
  emailChangeError.value = null
  emailChangeMessage.value = null
  const user = authStore.user
  const normalizedEmail = newEmail.value.trim()
  if (!user || !normalizedEmail) {
    emailChangeError.value = t('errors.newEmailRequired')
    return
  }
  if (normalizedEmail === user.email) {
    emailChangeError.value = t('errors.newEmailUnchanged')
    return
  }

  emailChangeLoading.value = true
  try {
    await requestEmailChange(user, normalizedEmail, currentPassword.value)
    currentPassword.value = ''
    emailChangeMessage.value = t('account.emailSent')
  } catch (caughtError) {
    emailChangeError.value = caughtError instanceof Error && (caughtError.message === authServiceErrorCodes.passwordConfirmationRequired || caughtError.message === authServiceErrorCodes.emailChangeUnavailable) ? t(caughtError.message === authServiceErrorCodes.passwordConfirmationRequired ? 'errors.passwordConfirmationRequired' : 'errors.emailChangeUnavailable') : getAuthErrorMessage(caughtError)
  } finally {
    emailChangeLoading.value = false
  }
}

async function refreshVerifiedEmail(): Promise<void> {
  const user = authStore.user
  if (!user) return
  emailChangeError.value = null
  emailChangeMessage.value = null
  emailChangeLoading.value = true
  try {
    await reloadAuthenticatedUser(user)
    await profileStore.reload(user)
    emailChangeMessage.value = t('account.emailSynchronized')
  } catch (caughtError) {
    emailChangeError.value = getAuthErrorMessage(caughtError)
  } finally {
    emailChangeLoading.value = false
  }
}

async function handlePasswordChange(): Promise<void> {
  const user = authStore.user
  passwordChangeError.value = null
  passwordChangeMessage.value = null
  if (!user || !passwordCurrent.value || !passwordNew.value) {
    passwordChangeError.value = t('errors.newPasswordRequired')
    return
  }
  if (passwordNew.value !== passwordConfirmation.value) {
    passwordChangeError.value = t('errors.newPasswordConfirmation')
    return
  }
  if (passwordCurrent.value === passwordNew.value) {
    passwordChangeError.value = t('errors.newPasswordUnchanged')
    return
  }

  passwordChangeLoading.value = true
  try {
    const validation = await checkPasswordAgainstPolicy(passwordNew.value)
    if (!validation.isValid) {
      passwordChangeError.value = getPasswordPolicyMessage(validation)
      return
    }
    await changePassword(user, passwordCurrent.value, passwordNew.value)
    passwordCurrent.value = ''
    passwordNew.value = ''
    passwordConfirmation.value = ''
    passwordChangeMessage.value = t('account.passwordChanged')
  } catch (caughtError) {
    passwordChangeError.value = getAuthErrorMessage(caughtError)
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
    deactivationError.value = profileStore.error ?? t('errors.accountDeactivationFailed')
  }
  deactivating.value = false
}
</script>

<template>
  <div class="flex flex-col gap-md">
  <Card aria-labelledby="change-email-heading">
    <CardHeader class="flex flex-col items-center text-center">
      <CardTitle id="change-email-heading" class="text-xl font-bold">{{ t('account.changeEmail') }}</CardTitle>
      <CardDescription>{{ t('account.emailIntro') }}</CardDescription>
      <CardDescription>
        {{ emailPasswordProvider ? t('account.emailPasswordHint') : t('account.emailGoogleHint') }}
      </CardDescription>
      <CardDescription>{{ t('account.spamHint') }}</CardDescription>
    </CardHeader>
    <CardContent>
      <form id="change-email-form" @submit.prevent="handleEmailChange">
        <FieldGroup class="grid w-full items-center gap-4">
          <Field class="flex flex-col">
            <FieldLabel for="new-email">{{ t('account.newEmail') }}</FieldLabel>
            <Input id="new-email" v-model="newEmail" type="email" autocomplete="email" required />
          </Field>
          <Field v-if="emailPasswordProvider" class="flex flex-col">
            <FieldLabel for="current-password">{{ t('common.currentPassword') }}</FieldLabel>
            <Input id="current-password" v-model="currentPassword" type="password" autocomplete="current-password" required />
          </Field>
          <FieldError v-if="emailChangeError" class="form-error">{{ emailChangeError }}</FieldError>
          <p v-if="emailChangeMessage" class="form-success text-sm">{{ emailChangeMessage }}</p>
        </FieldGroup>
      </form>
    </CardContent>
    <CardFooter class="flex flex-col gap-2">
      <Button form="change-email-form" type="submit" class="w-full" :disabled="emailChangeLoading">
        {{ emailChangeLoading ? t('buttons.requesting') : t('buttons.sendVerificationLink') }}
      </Button>
      <Button type="button" variant="outline" class="w-full" :disabled="emailChangeLoading" @click="refreshVerifiedEmail">
        {{ t('buttons.verifiedEmail') }}
      </Button>
    </CardFooter>
  </Card>

  <Card v-if="emailPasswordProvider" aria-labelledby="change-password-heading">
    <CardHeader class="flex flex-col items-center text-center">
      <CardTitle id="change-password-heading" class="text-xl font-bold">{{ t('account.changePassword') }}</CardTitle>
      <CardDescription>{{ t('account.changePasswordIntro') }}</CardDescription>
      <CardDescription>{{ t('account.passwordSecurityHint') }}</CardDescription>
      <CardDescription v-if="passwordPolicyMessage">{{ passwordPolicyMessage }}</CardDescription>
    </CardHeader>
    <CardContent>
      <form id="change-password-form" @submit.prevent="handlePasswordChange">
        <FieldGroup class="grid w-full items-center gap-4">
          <Field class="flex flex-col">
            <FieldLabel for="password-current">{{ t('common.currentPassword') }}</FieldLabel>
            <Input id="password-current" v-model="passwordCurrent" type="password" autocomplete="current-password" required />
          </Field>
          <Field class="flex flex-col">
            <FieldLabel for="password-new">{{ t('common.newPassword') }}</FieldLabel>
            <Input id="password-new" v-model="passwordNew" type="password" autocomplete="new-password" required />
          </Field>
          <Field class="flex flex-col">
            <FieldLabel for="password-confirmation">{{ t('common.confirmNewPassword') }}</FieldLabel>
            <Input id="password-confirmation" v-model="passwordConfirmation" type="password" autocomplete="new-password" required />
          </Field>
          <FieldError v-if="passwordChangeError" class="form-error">
            {{ passwordChangeError }}
          </FieldError>
          <p v-if="passwordChangeMessage" class="form-success text-sm">{{ passwordChangeMessage }}</p>
        </FieldGroup>
      </form>
    </CardContent>
    <CardFooter class="flex flex-col gap-2">
      <Button form="change-password-form" type="submit" class="w-full" :disabled="passwordChangeLoading">
        {{ passwordChangeLoading ? t('buttons.changing') : t('buttons.changePassword') }}
      </Button>
    </CardFooter>
  </Card>

  <Card aria-labelledby="deactivate-account-heading" class="border-destructive">
    <CardHeader class="flex flex-col items-center text-center">
      <CardTitle id="deactivate-account-heading" class="text-xl font-bold">{{ t('account.deactivate') }}</CardTitle>
      <CardDescription>{{ t('account.deactivateIntro') }}</CardDescription>
    </CardHeader>
    <CardContent class="flex flex-col gap-2">
      <FieldError v-if="deactivationError" class="form-error">{{ deactivationError }}</FieldError>
      <Button type="button" variant="destructive" class="w-full" :disabled="deactivating || profileStore.loading" @click="handleDeactivation">
        {{ deactivating ? t('buttons.deactivating') : t('buttons.deactivateAccount') }}
      </Button>
    </CardContent>
  </Card>
  </div>
</template>
