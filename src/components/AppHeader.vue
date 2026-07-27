<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import AuthNavigation from '@/components/auth/AuthNavigation.vue'
import { useAuthStore } from '@/stores/auth.store'

const authStore = useAuthStore()

const homeLocation = computed(() => {
  return authStore.isAuthenticated ? { name: 'home' } : { name: 'welcome' }
})
</script>

<template>
  <header class="app-header">
    <div class="app-header__main">
      <RouterLink class="app-header__brand" :to="homeLocation"> Vue Firebase Starter </RouterLink>

      <nav
        v-if="authStore.isAuthenticated"
        class="app-header__navigation"
        aria-label="Navegación principal"
      >
        <RouterLink :to="{ name: 'home' }"> Home </RouterLink>
      </nav>
    </div>

    <AuthNavigation />
  </header>
</template>
