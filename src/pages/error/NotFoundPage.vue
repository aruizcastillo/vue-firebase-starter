<script setup lang="ts">
import { RouterLink } from 'vue-router'

import { PageContainer } from '@/components/ui/page'
</script>

<template>
  <PageContainer centered>
    <h1>{{ $t('notFound.title') }}</h1>

    <RouterLink to="/">{{ $t('navigation.backToHome') }}</RouterLink>
  </PageContainer>
</template>
