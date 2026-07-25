<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="auth-layout">
    <header class="auth-header">
      <RouterLink class="auth-header__brand" :to="{ name: 'login' }">
        Vue Firebase Starter
      </RouterLink>
    </header>

    <main class="auth-content">
      <RouterView />
    </main>
  </div>
</template>
