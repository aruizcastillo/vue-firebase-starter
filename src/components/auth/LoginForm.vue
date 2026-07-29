<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth.store'

const emit = defineEmits<{ success: [] }>()
const authStore = useAuthStore()
const { t } = useI18n()
const email = ref('')
const password = ref('')

async function handleSubmit(): Promise<void> {
  if (!email.value || !password.value) return
  if (await authStore.login(email.value.trim(), password.value)) emit('success')
}
async function handleGoogleLogin(): Promise<void> {
  if (await authStore.googleLogin()) emit('success')
}
</script>

<template>
  <form class="auth-form" @submit.prevent="handleSubmit">
    <div class="field">
      <label for="login-email">{{ t('common.email') }}</label
      ><input id="login-email" v-model="email" type="email" autocomplete="email" required />
    </div>
    <div class="field">
      <label for="login-password">{{ t('common.password') }}</label
      ><input
        id="login-password"
        v-model="password"
        type="password"
        autocomplete="current-password"
        required
      />
    </div>
    <p v-if="authStore.error" class="form-error">{{ authStore.error }}</p>
    <button type="submit" :disabled="authStore.authStatus === 'authenticating'">
      {{ authStore.authStatus === 'authenticating' ? t('buttons.loggingIn') : t('buttons.login') }}
    </button>
    <button
      type="button"
      :disabled="authStore.authStatus === 'authenticating'"
      @click="handleGoogleLogin"
    >
      {{ t('buttons.continueWithGoogle') }}
    </button>
  </form>
</template>
