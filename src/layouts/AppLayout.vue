<script setup lang="ts">
import { RouterView } from 'vue-router'

import AppHeader from '@/components/AppHeader.vue'
</script>

<template>
  <div>
    <AppHeader />

    <main>
      <RouterView />
    </main>
  </div>
</template>
