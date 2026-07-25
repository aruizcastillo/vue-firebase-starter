<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router'

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
      Hello,
      {{ authStore.profile?.displayName || authStore.user?.email || 'user' }}.
    </p>

    <nav>
      <RouterLink to="/profile"> Edit Profile </RouterLink>
    </nav>

    <p v-if="authStore.error" class="form-error">
      {{ authStore.error }}
    </p>

    <button type="button" :disabled="authStore.loading" @click="handleLogout">Logout</button>
  </main>
</template>
