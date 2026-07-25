<script setup lang="ts">
import { useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth.store'

const router = useRouter()
const authStore = useAuthStore()

async function handleLogout(): Promise<void> {
  const succeeded = await authStore.signOut()

  if (succeeded) {
    await router.replace('/login')
  }
}
</script>

<template>
  <main>
    <h1>Vue Firebase Starter</h1>

    <p>
      Signed in as
      {{ authStore.user?.email ?? 'user' }}.
    </p>

    <p v-if="authStore.error" class="form-error">
      {{ authStore.error }}
    </p>

    <button type="button" :disabled="authStore.loading" @click="handleLogout">Sign out</button>
  </main>
</template>
