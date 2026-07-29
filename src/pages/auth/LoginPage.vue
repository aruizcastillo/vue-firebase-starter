<script setup lang="ts">
import { computed, onBeforeMount } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import LoginForm from '@/components/auth/LoginForm.vue'
import { useAuthStore } from '@/stores/auth.store'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const redirectPath = computed(() => {
  const redirect = route.query.redirect

  return typeof redirect === 'string' ? redirect : '/'
})

onBeforeMount(() => {
  authStore.clearError()
})

async function handleSuccess(): Promise<void> {
  await router.replace(redirectPath.value)
}
</script>

<template>
  <section class="auth-card">
    <h1>{{ $t('navigation.signIn') }}</h1>

    <LoginForm @success="handleSuccess" />

    <nav>
      <RouterLink to="/forgot-password">{{ $t('navigation.forgotPassword') }}</RouterLink>

      <RouterLink to="/register">{{ $t('navigation.createAccount') }}</RouterLink>
    </nav>
  </section>
</template>
