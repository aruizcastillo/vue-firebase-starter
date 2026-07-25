<script setup lang="ts">
import { RouterView } from 'vue-router'

import AppHeader from '@/components/AppHeader.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useProfileStore } from '@/stores/profile.store'

const authStore = useAuthStore()
const profileStore = useProfileStore()

async function handleProfileRetry(): Promise<void> {
  await profileStore.reload(authStore.user)
}
</script>

<template>
  <div class="app-layout">
    <AppHeader />

    <aside v-if="profileStore.error" class="form-error" role="alert">
      {{ profileStore.error }}

      <button type="button" :disabled="profileStore.loading" @click="handleProfileRetry">
        {{ profileStore.loading ? 'Retrying…' : 'Retry' }}
      </button>
    </aside>

    <main class="app-content">
      <RouterView />
    </main>
  </div>
</template>
