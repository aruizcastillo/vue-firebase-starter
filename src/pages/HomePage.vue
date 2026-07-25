<script setup lang="ts">
import { computed } from 'vue'

import { useAuthStore } from '@/stores/auth.store'

const authStore = useAuthStore()

const userLabel = computed(() => {
  return authStore.profile?.displayName || authStore.user?.email || 'user'
})
</script>

<template>
  <section class="home-page">
    <h1>Hello, {{ userLabel }}</h1>

    <p>The authentication and profile are configured correctly.</p>
  </section>
</template>
