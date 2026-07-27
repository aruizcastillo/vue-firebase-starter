<script setup lang="ts">
import { onBeforeMount } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import RegisterForm from '@/components/auth/RegisterForm.vue'
import { useAuthStore } from '@/stores/auth.store'

const router = useRouter()
const authStore = useAuthStore()

onBeforeMount(() => {
  authStore.clearError()
})

async function handleSuccess(): Promise<void> {
  await router.replace('/')
}
</script>

<template>
  <section class="auth-card">
    <h1>{{ $t('navigation.createAccount') }}</h1>

    <RegisterForm @success="handleSuccess" />

    <RouterLink to="/login">{{ $t('navigation.alreadyHaveAccount') }}</RouterLink>
  </section>
</template>
