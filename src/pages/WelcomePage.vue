<script setup lang="ts">
import { PageContainer } from '@/components/ui/page'
</script>

<template>
  <PageContainer centered>
    <h1>{{ $t('app.name') }}</h1>

    <p>
      {{ $t('welcome.description') }}
    </p>
  </PageContainer>
</template>
