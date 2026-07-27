<script setup lang="ts">
import { computed, onBeforeMount, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

import {
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

const displayName = ref('')
const saved = ref(false)
const validationError = ref<string | null>(null)
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
const emailPasswordProvider = computed(() => {
  return (
    authStore.user?.providerData.some((provider) => provider.providerId === 'password') ?? false
  )
})

watch(
  () => profileStore.profile?.displayName,
  (currentDisplayName) => {
    displayName.value = currentDisplayName ?? ''
  },
  {
    immediate: true,
  },
)

onBeforeMount(() => {
  if (emailPasswordProvider.value) {
    void loadPasswordPolicy()
  }
})

async function loadPasswordPolicy(): Promise<void> {
  try {
    const validation = await checkPasswordAgainstPolicy('')
    passwordPolicyMessage.value = validation.isValid ? null : getPasswordPolicyMessage(validation)
  } catch {
    passwordPolicyMessage.value = null
  }
}

async function handleSubmit(): Promise<void> {
  saved.value = false
  validationError.value = null

  const normalizedDisplayName = displayName.value.trim()

  if (normalizedDisplayName.length > 80) {
    validationError.value = 'The name cannot exceed 80 characters.'
    return
  }

  const succeeded = await profileStore.update(authStore.user, normalizedDisplayName)

  if (succeeded) {
    saved.value = true
  }
}

async function handleEmailChange(): Promise<void> {
  emailChangeError.value = null
  emailChangeMessage.value = null
  const user = authStore.user
  const normalizedEmail = newEmail.value.trim()

  if (!user || !normalizedEmail) {
    emailChangeError.value = 'Enter the new email address.'
    return
  }

  if (normalizedEmail === user.email) {
    emailChangeError.value = 'The new email address must be different.'
    return
  }

  emailChangeLoading.value = true
  try {
    await requestEmailChange(user, normalizedEmail, currentPassword.value)
    currentPassword.value = ''
    emailChangeMessage.value =
      'We sent a verification link to the new address. Your email will change after you confirm it.'
  } catch (caughtError) {
    emailChangeError.value =
      caughtError instanceof Error &&
      (caughtError.message === 'Password confirmation is required.' ||
        caughtError.message === 'Email changes are not available for this sign-in provider.')
        ? caughtError.message
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
    emailChangeMessage.value = 'Your Firebase email and profile have been synchronized.'
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
    passwordChangeError.value = 'Enter your current password and a new password.'
    return
  }

  if (passwordNew.value !== passwordConfirmation.value) {
    passwordChangeError.value = 'The new password confirmation does not match.'
    return
  }

  if (passwordCurrent.value === passwordNew.value) {
    passwordChangeError.value = 'The new password must be different from the current password.'
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
    passwordChangeMessage.value = 'Your password has been changed.'
  } catch (caughtError) {
    passwordChangeError.value = getAuthErrorMessage(caughtError)
  } finally {
    passwordChangeLoading.value = false
  }
}

async function handleDeactivation(): Promise<void> {
  if (
    !authStore.user ||
    !window.confirm(
      'Deactivate your account? Your data will be preserved and you can reactivate it later.',
    )
  ) {
    return
  }

  deactivationError.value = null
  deactivating.value = true
  const succeeded = await profileStore.updateStatus(authStore.user, 'deactivated')

  if (succeeded) {
    await authStore.signOut()
  } else {
    deactivationError.value = profileStore.error ?? 'The account could not be deactivated.'
  }
  deactivating.value = false
}
</script>

<template>
  <section class="profile-page">
    <h1>Profile</h1>

    <form class="profile-form" @submit.prevent="handleSubmit">
      <div class="field">
        <label for="profile-email"> Email address </label>

        <input
          id="profile-email"
          :value="profileStore.profile?.email ?? ''"
          type="email"
          disabled
        />
      </div>

      <div class="field">
        <label for="display-name"> Name </label>

        <input
          id="display-name"
          v-model="displayName"
          type="text"
          autocomplete="name"
          maxlength="80"
        />
      </div>

      <p v-if="validationError || profileStore.error" class="form-error">
        {{ validationError ?? profileStore.error }}
      </p>

      <p v-if="saved" class="form-success">Profile updated.</p>

      <button
        type="submit"
        :disabled="profileStore.updating || profileStore.loading || !profileStore.profile"
      >
        {{ profileStore.updating ? 'Saving…' : profileStore.loading ? 'Loading profile…' : 'Save' }}
      </button>
    </form>

    <section class="profile-section" aria-labelledby="change-email-heading">
      <h2 id="change-email-heading">Change email address</h2>
      <p>Your change must be confirmed from a verification link sent by Firebase.</p>
      <p v-if="emailPasswordProvider" class="form-hint">
        For security, you must re-authenticate by entering your current password before Firebase
        sends the verification email.
      </p>
      <p v-else class="form-hint">
        For security, submitting this form opens a Google window. Sign in to your Google account
        again to re-authenticate before Firebase sends the verification email.
      </p>
      <p class="form-hint">Check your spam or junk folder if the verification email is delayed.</p>

      <form class="profile-form" @submit.prevent="handleEmailChange">
        <div class="field">
          <label for="new-email">New email address</label>
          <input id="new-email" v-model="newEmail" type="email" autocomplete="email" required />
        </div>

        <div v-if="emailPasswordProvider" class="field">
          <label for="current-password">Current password</label>
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
          {{ emailChangeLoading ? 'Requesting…' : 'Send verification link' }}
        </button>
        <button type="button" :disabled="emailChangeLoading" @click="refreshVerifiedEmail">
          I have verified the new email
        </button>
      </form>
    </section>

    <section
      v-if="emailPasswordProvider"
      class="profile-section"
      aria-labelledby="change-password-heading"
    >
      <h2 id="change-password-heading">Change password</h2>
      <p>Confirm your current password before choosing a new one.</p>
      <p class="form-hint">
        For security, entering your current password re-authenticates your account before the
        password is changed.
      </p>
      <p v-if="passwordPolicyMessage" class="form-hint">{{ passwordPolicyMessage }}</p>

      <form class="profile-form" @submit.prevent="handlePasswordChange">
        <div class="field">
          <label for="password-current">Current password</label>
          <input
            id="password-current"
            v-model="passwordCurrent"
            type="password"
            autocomplete="current-password"
            required
          />
        </div>

        <div class="field">
          <label for="password-new">New password</label>
          <input
            id="password-new"
            v-model="passwordNew"
            type="password"
            autocomplete="new-password"
            required
          />
        </div>

        <div class="field">
          <label for="password-confirmation">Confirm new password</label>
          <input
            id="password-confirmation"
            v-model="passwordConfirmation"
            type="password"
            autocomplete="new-password"
            required
          />
        </div>

        <p v-if="passwordChangeError" class="form-error" role="alert">
          {{ passwordChangeError }}
        </p>
        <p v-if="passwordChangeMessage" class="form-success">{{ passwordChangeMessage }}</p>

        <button type="submit" :disabled="passwordChangeLoading">
          {{ passwordChangeLoading ? 'Changing…' : 'Change password' }}
        </button>
      </form>
    </section>

    <section
      class="profile-section profile-section--danger"
      aria-labelledby="deactivate-account-heading"
    >
      <h2 id="deactivate-account-heading">Deactivate account</h2>
      <p>
        Your account and data will be kept. You will be signed out and can reactivate the account
        after signing in again.
      </p>
      <p v-if="deactivationError" class="form-error" role="alert">{{ deactivationError }}</p>
      <button
        type="button"
        :disabled="deactivating || profileStore.loading"
        @click="handleDeactivation"
      >
        {{ deactivating ? 'Deactivating…' : 'Deactivate account' }}
      </button>
    </section>

    <RouterLink to="/"> Back to home </RouterLink>
  </section>
</template>
