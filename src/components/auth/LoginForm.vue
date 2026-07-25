<script setup lang="ts">
import { ref } from 'vue'

import { useAuthStore } from '@/stores/auth.store'

const emit = defineEmits<{
  success: []
}>()

const authStore = useAuthStore()

const email = ref('')
const password = ref('')

async function handleSubmit(): Promise<void> {
  if (!email.value || !password.value) {
    return
  }

  const succeeded = await authStore.login(email.value.trim(), password.value)

  if (succeeded) {
    emit('success')
  }
}

async function handleGoogleLogin(): Promise<void> {
  const succeeded = await authStore.googleLogin()

  if (succeeded) {
    emit('success')
  }
}
</script>

<template>
  <form class="auth-form" @submit.prevent="handleSubmit">
    <div class="field">
      <label for="login-email">Email</label>

      <input id="login-email" v-model="email" type="email" autocomplete="email" required />
    </div>

    <div class="field">
      <label for="login-password">Password</label>

      <input
        id="login-password"
        v-model="password"
        type="password"
        autocomplete="current-password"
        required
      />
    </div>

    <p v-if="authStore.error" class="form-error">
      {{ authStore.error }}
    </p>

    <button type="submit" :disabled="authStore.loading">
      {{ authStore.loading ? 'Logging in…' : 'Login' }}
    </button>

    <button type="button" :disabled="authStore.loading" @click="handleGoogleLogin">
      Continue with Google
    </button>
  </form>
</template>
