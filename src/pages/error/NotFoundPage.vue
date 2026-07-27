<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <main>
    <h1>{{ $t('notFound.title') }}</h1>

    <RouterLink to="/">{{ $t('navigation.backToHome') }}</RouterLink>
  </main>
</template>
