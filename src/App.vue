<script setup lang="ts">
import { computed } from 'vue'
import { RouterView } from 'vue-router'

import SessionFeedbackOverlay from '@/components/auth/SessionFeedbackOverlay.vue'
import { authConfig } from '@/config/auth.config'
import { useAuthStore } from '@/stores/auth.store'
import { useProfileStore } from '@/stores/profile.store'
import { useSessionStore } from '@/stores/session.store'

import 'vue-sonner/style.css'
import { Spinner } from '@/components/ui/spinner'
import { Toaster } from '@/components/ui/sonner'

const authStore = useAuthStore()
const profileStore = useProfileStore()
const sessionStore = useSessionStore()
const appReady = computed(() => {
  if (sessionStore.phase === 'error') return true
  if (!authStore.initialized) return false
  if (!authStore.user || !authConfig.requiresAccountStatus) return true

  return profileStore.state === 'ready'
})
</script>

<template>
  <main v-if="!appReady" class="flex min-h-dvh items-center justify-center">
    <Spinner class="size-6" />
  </main>

  <div v-else :inert="sessionStore.isBlocking">
    <RouterView />
  </div>

  <SessionFeedbackOverlay v-if="appReady" />
  <Toaster />
</template>
