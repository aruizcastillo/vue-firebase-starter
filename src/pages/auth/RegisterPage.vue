<script setup lang="ts">
import { onBeforeMount } from 'vue'
import { useRouter } from 'vue-router'

import RegisterForm from '@/components/auth/RegisterForm.vue'
import { useAuthStore } from '@/stores/auth.store'

import { PageContainer } from '@/components/ui/page'

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
  <PageContainer centered>
    <RegisterForm @success="handleSuccess" class="w-full max-w-md" />
  </PageContainer>
</template>
