<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth.store'

const router = useRouter()
const authStore = useAuthStore()

const userLabel = computed(() => {
  return authStore.profile?.displayName || authStore.user?.email || 'User'
})

async function handleLogout(): Promise<void> {
  const succeeded = await authStore.signOut()

  if (!succeeded) {
    return
  }

  await router.replace({
    name: 'welcome',
  })
}
</script>

<template>
  <nav v-if="authStore.isAuthenticated" class="auth-navigation" aria-label="Navegación de usuario">
    <RouterLink class="auth-navigation__user" :to="{ name: 'profile' }">
      {{ userLabel }}
    </RouterLink>

    <button type="button" :disabled="authStore.authStatus === 'signing-out'" @click="handleLogout">
      {{ authStore.authStatus === 'signing-out' ? 'Signing out…' : 'Sign out' }}
    </button>
  </nav>

  <nav v-else class="auth-navigation" aria-label="Authentication">
    <RouterLink :to="{ name: 'login' }"> Sign in </RouterLink>

    <RouterLink :to="{ name: 'register' }"> Create account </RouterLink>
  </nav>
</template>
