<script setup lang="ts">
import { RouterView } from 'vue-router'

import AppHeader from '@/components/AppHeader.vue'
import { useAuthStore } from '@/stores/auth.store'

const authStore = useAuthStore()

async function handleProfileRetry(): Promise<void> {
  await authStore.reloadProfile()
}
</script>

<template>
  <div class="app-layout">
    <AppHeader />

    <aside v-if="authStore.profileError" class="form-error" role="alert">
      {{ authStore.profileError }}

      <button type="button" :disabled="authStore.profileLoading" @click="handleProfileRetry">
        {{ authStore.profileLoading ? 'Retrying…' : 'Retry' }}
      </button>
    </aside>

    <main class="app-content">
      <RouterView />
    </main>
  </div>
</template>
