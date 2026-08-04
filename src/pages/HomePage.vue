<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useAuthStore } from '@/stores/auth.store'

import { PageContainer } from '@/components/ui/page'

const authStore = useAuthStore()
const { t } = useI18n()

const userLabel = computed(() => {
  return authStore.user?.displayName || authStore.user?.email || t('common.user')
})
</script>

<template>
  <PageContainer centered>
    <h1 class="text-3xl font-bold">{{ t('home.greeting', { name: userLabel }) }}</h1>

    <p class="text-muted-foreground">{{ t('home.configured') }}</p>
  </PageContainer>
</template>
