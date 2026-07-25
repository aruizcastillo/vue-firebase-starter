<script setup lang="ts">
import { onBeforeMount, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { useAuthStore } from '@/stores/auth.store'

const authStore = useAuthStore()

const email = ref('')
const sent = ref(false)

onBeforeMount(() => {
  authStore.clearError()
})

async function handleSubmit(): Promise<void> {
  sent.value = false

  const succeeded = await authStore.sendPasswordReset(email.value.trim())

  if (succeeded) {
    sent.value = true
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-card">
      <h1>Reset your password</h1>

      <form class="auth-form" @submit.prevent="handleSubmit">
        <div class="field">
          <label for="reset-email"> Email address </label>

          <input id="reset-email" v-model="email" type="email" autocomplete="email" required />
        </div>

        <p v-if="authStore.error" class="form-error">
          {{ authStore.error }}
        </p>

        <p v-if="sent" class="form-success">The password reset email has been sent.</p>

        <button type="submit" :disabled="authStore.loading">
          {{ authStore.loading ? 'Sending…' : 'Send email' }}
        </button>
      </form>

      <RouterLink to="/login"> Back to sign in </RouterLink>
    </section>
  </main>
</template>
