<script setup lang="ts">
import { RouterView } from 'vue-router'

import AppHeader from '@/components/AppHeader.vue'
</script>

<template>
  <div class="public-layout">
    <AppHeader />

    <main class="public-content">
      <RouterView />
    </main>
  </div>
</template>
