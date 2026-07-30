<script setup lang="ts">
import { computed, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'

import AuthNavigation from '@/components/auth/AuthNavigation.vue'
import { setLocale, type SupportedLocale } from '@/i18n'
import { useAuthStore } from '@/stores/auth.store'

const authStore = useAuthStore()
const { locale, t } = useI18n()

const homeLocation = computed(() => {
  return authStore.isAuthenticated ? { name: 'home' } : { name: 'welcome' }
})

watch(locale, (value) => setLocale(value as SupportedLocale))
</script>

<template>
  <header class="app-header">
    <div class="app-header__main">
      <RouterLink class="app-header__brand" :to="homeLocation">{{ t('app.name') }}</RouterLink>

      <nav v-if="authStore.isAuthenticated" class="app-header__navigation" :aria-label="t('navigation.main')">
        <RouterLink :to="{ name: 'home' }">{{ t('navigation.home') }}</RouterLink>
      </nav>
    </div>

    <div class="app-header__actions">
      <label class="app-header__locale">
        <span class="visually-hidden">{{ t('common.language') }}</span>
        <select v-model="locale" :aria-label="t('common.language')">
          <option value="en">{{ t('languages.en') }}</option>
          <option value="es">{{ t('languages.es') }}</option>
        </select>
      </label>

      <AuthNavigation />
    </div>
  </header>
</template>
