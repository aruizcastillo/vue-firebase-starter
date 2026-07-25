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
  <main class="auth-page">
    <section class="auth-card">
      <h1>Sign in</h1>

      <LoginForm @success="handleSuccess" />

      <nav>
        <RouterLink to="/forgot-password"> I forgot my password </RouterLink>

        <RouterLink to="/register"> Create an account </RouterLink>
      </nav>
    </section>
  </main>
</template>
