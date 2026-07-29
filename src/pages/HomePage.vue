<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useAuthStore } from '@/stores/auth.store'
import { useProfileStore } from '@/stores/profile.store'

const authStore = useAuthStore()
const profileStore = useProfileStore()
const { t } = useI18n()

const userLabel = computed(() => {
  return profileStore.profile?.displayName || authStore.user?.email || t('common.user')
})
</script>

<template>
  <section class="home-page">
    <h1>{{ t('home.greeting', { name: userLabel }) }}</h1>

    <p>{{ t('home.configured') }}</p>
  </section>
</template>
