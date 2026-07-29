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
  <section class="auth-card">
    <h1>{{ $t('auth.resetPassword') }}</h1>

    <form class="auth-form" @submit.prevent="handleSubmit">
      <div class="field">
        <label for="reset-email">{{ $t('common.email') }}</label>

        <input id="reset-email" v-model="email" type="email" autocomplete="email" required />
      </div>

      <p v-if="authStore.error" class="form-error">
        {{ authStore.error }}
      </p>

      <p v-if="sent" class="form-success">
        {{ $t('auth.resetEmailSent') }}
      </p>

      <button type="submit" :disabled="authStore.operationLoading">
        {{ authStore.operationLoading ? $t('buttons.sending') : $t('buttons.sendEmail') }}
      </button>
    </form>

    <RouterLink to="/login">{{ $t('navigation.backToSignIn') }}</RouterLink>
  </section>
</template>
