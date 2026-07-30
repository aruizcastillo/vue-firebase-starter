<script setup lang="ts">
import { computed, onBeforeMount, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  authServiceErrorCodes,
  changePassword,
  checkPasswordAgainstPolicy,
  reloadAuthenticatedUser,
  requestEmailChange,
} from '@/services/auth.service'
import { useAuthStore } from '@/stores/auth.store'
import { useProfileStore } from '@/stores/profile.store'
import { getAuthErrorMessage } from '@/utils/auth-errors'
import { getPasswordPolicyMessage } from '@/utils/password-policy'

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
const emailPasswordProvider = computed(
  () =>
    authStore.user?.providerData.some((provider) => provider.providerId === 'password') ?? false,
)

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
    emailChangeError.value =
      caughtError instanceof Error &&
      (caughtError.message === authServiceErrorCodes.passwordConfirmationRequired ||
        caughtError.message === authServiceErrorCodes.emailChangeUnavailable)
        ? t(
            caughtError.message === authServiceErrorCodes.passwordConfirmationRequired
              ? 'errors.passwordConfirmationRequired'
              : 'errors.emailChangeUnavailable',
          )
        : getAuthErrorMessage(caughtError)
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
  <section class="settings-section" aria-labelledby="change-email-heading">
    <h2 id="change-email-heading">{{ t('account.changeEmail') }}</h2>
    <p>{{ t('account.emailIntro') }}</p>
    <p v-if="emailPasswordProvider" class="form-hint">{{ t('account.emailPasswordHint') }}</p>
    <p v-else class="form-hint">{{ t('account.emailGoogleHint') }}</p>
    <p class="form-hint">{{ t('account.spamHint') }}</p>
    <form class="settings-form" @submit.prevent="handleEmailChange">
      <div class="field">
        <label for="new-email">{{ t('account.changeEmail') }}</label>
        <input id="new-email" v-model="newEmail" type="email" autocomplete="email" required />
      </div>
      <div v-if="emailPasswordProvider" class="field">
        <label for="current-password">{{ t('common.currentPassword') }}</label>
        <input
          id="current-password"
          v-model="currentPassword"
          type="password"
          autocomplete="current-password"
          required
        />
      </div>
      <p v-if="emailChangeError" class="form-error" role="alert">{{ emailChangeError }}</p>
      <p v-if="emailChangeMessage" class="form-success">{{ emailChangeMessage }}</p>
      <button type="submit" :disabled="emailChangeLoading">
        {{ emailChangeLoading ? t('buttons.requesting') : t('buttons.sendVerificationLink') }}
      </button>
      <button type="button" :disabled="emailChangeLoading" @click="refreshVerifiedEmail">
        {{ t('buttons.verifiedEmail') }}
      </button>
    </form>
  </section>
  <section
    v-if="emailPasswordProvider"
    class="settings-section"
    aria-labelledby="change-password-heading"
  >
    <h2 id="change-password-heading">{{ t('account.changePassword') }}</h2>
    <p>{{ t('account.changePasswordIntro') }}</p>
    <p class="form-hint">{{ t('account.passwordSecurityHint') }}</p>
    <p v-if="passwordPolicyMessage" class="form-hint">{{ passwordPolicyMessage }}</p>
    <form class="settings-form" @submit.prevent="handlePasswordChange">
      <div class="field">
        <label for="password-current">{{ t('common.currentPassword') }}</label>
        <input
          id="password-current"
          v-model="passwordCurrent"
          type="password"
          autocomplete="current-password"
          required
        />
      </div>
      <div class="field">
        <label for="password-new">{{ t('common.newPassword') }}</label>
        <input
          id="password-new"
          v-model="passwordNew"
          type="password"
          autocomplete="new-password"
          required
        />
      </div>
      <div class="field">
        <label for="password-confirmation">{{ t('common.confirmNewPassword') }}</label>
        <input
          id="password-confirmation"
          v-model="passwordConfirmation"
          type="password"
          autocomplete="new-password"
          required
        />
      </div>
      <p v-if="passwordChangeError" class="form-error" role="alert">{{ passwordChangeError }}</p>
      <p v-if="passwordChangeMessage" class="form-success">{{ passwordChangeMessage }}</p>
      <button type="submit" :disabled="passwordChangeLoading">
        {{ passwordChangeLoading ? t('buttons.changing') : t('buttons.changePassword') }}
      </button>
    </form>
  </section>
  <section
    class="settings-section settings-section--danger"
    aria-labelledby="deactivate-account-heading"
  >
    <h2 id="deactivate-account-heading">{{ t('account.deactivate') }}</h2>
    <p>{{ t('account.deactivateIntro') }}</p>
    <p v-if="deactivationError" class="form-error" role="alert">{{ deactivationError }}</p>
    <button
      type="button"
      :disabled="deactivating || profileStore.loading"
      @click="handleDeactivation"
    >
      {{ deactivating ? t('buttons.deactivating') : t('buttons.deactivateAccount') }}
    </button>
  </section>
</template>
