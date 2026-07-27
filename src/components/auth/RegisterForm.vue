<script setup lang="ts">
import { computed, onBeforeMount, ref } from 'vue'

import { useAuthStore } from '@/stores/auth.store'
import { getPasswordPolicyMessage } from '@/utils/password-policy'

const emit = defineEmits<{
  success: []
}>()

const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const validationError = ref<string | null>(null)
const passwordPolicyMessage = ref<string | null>(null)
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

async function handleSubmit(): Promise<void> {
  validationError.value = null
  authStore.clearError()

  if (password.value !== confirmPassword.value) {
    validationError.value = 'The passwords do not match.'
    return
  }

  const passwordStatus = await authStore.validateRegistrationPassword(password.value)

  if (!passwordStatus) {
    return
  }

  if (!passwordStatus.isValid) {
    validationError.value = getPasswordPolicyMessage(passwordStatus)
    return
  }

  const succeeded = await authStore.register(email.value.trim(), password.value)

  if (succeeded) {
    emit('success')
  }
}
</script>

<template>
  <form class="auth-form" @submit.prevent="handleSubmit">
    <div class="field">
      <label for="register-email"> Email address </label>

      <input id="register-email" v-model="email" type="email" autocomplete="email" required />
    </div>

    <div class="field">
      <label for="register-password"> Password </label>

      <input
        id="register-password"
        v-model="password"
        type="password"
        autocomplete="new-password"
        required
      />
    </div>

    <div class="field">
      <label for="confirm-password"> Confirm password </label>

      <input
        id="confirm-password"
        v-model="confirmPassword"
        type="password"
        autocomplete="new-password"
        required
      />
    </div>

    <p v-if="passwordPolicyMessage" class="form-hint">{{ passwordPolicyMessage }}</p>

    <p v-if="validationError || authStore.error" class="form-error">
      {{ validationError ?? authStore.error }}
    </p>

    <button type="submit" :disabled="submitting">
      {{
        checkingPassword
          ? 'Checking password…'
          : creatingAccount
            ? 'Creating account…'
            : 'Create account'
      }}
    </button>
  </form>
</template>
