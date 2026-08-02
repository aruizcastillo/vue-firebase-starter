<script setup lang="ts">
import { RouterView } from 'vue-router'

import SessionFeedbackOverlay from '@/components/SessionFeedbackOverlay.vue'
import { useSessionStore } from '@/stores/session.store'

const sessionStore = useSessionStore()
</script>

<template>
  <div :inert="sessionStore.isBlocking">
    <RouterView />
  </div>

  <SessionFeedbackOverlay />
</template>
