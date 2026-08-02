<script setup lang="ts">
import { computed } from 'vue'
import { RouterView } from 'vue-router'

import { Spinner } from '@/components/ui/spinner'
import { useAuthStore } from '@/stores/auth.store'
import { useProfileStore } from '@/stores/profile.store'

const authStore = useAuthStore()
const profileStore = useProfileStore()

const appReady = computed(() => {
  if (!authStore.initialized) return false
  if (!authStore.user) return true

  return profileStore.initialized
})
</script>

<template>
  <main v-if="!appReady" class="flex min-h-dvh items-center justify-center">
    <Spinner class="size-6" />
  </main>

  <RouterView v-else />
</template>

<style scoped></style>
