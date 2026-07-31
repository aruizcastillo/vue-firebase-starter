<script setup lang="ts">
import { computed, onBeforeMount } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import LoginForm from '@/components/auth/LoginForm.vue'
import { useAuthStore } from '@/stores/auth.store'

import { PageContainer } from '@/components/ui/page'

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
  <PageContainer centered>
    <LoginForm @success="handleSuccess" />
  </PageContainer>
</template>
