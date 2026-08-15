<script setup lang="ts">
import { RouterView } from 'vue-router'

import SessionFeedbackOverlay from '@/components/auth/SessionFeedbackOverlay.vue'
import { useSessionStore } from '@/stores/session.store'

import 'vue-sonner/style.css'
import { Toaster } from '@/components/ui/sonner'

const sessionStore = useSessionStore()
</script>

<template>
  <div v-if="sessionStore.isApplicationReady" :inert="sessionStore.isBlocking">
    <RouterView />
  </div>

  <SessionFeedbackOverlay />
  <Toaster position="top-center" />
</template>
