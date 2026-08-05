<script setup lang="ts">
import { computed, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'

import AuthNavigation from '@/components/auth/AuthNavigation.vue'
import { useTheme } from '@/composables/useTheme'
import { setLocale, type SupportedLocale } from '@/i18n'
import { useAuthStore } from '@/stores/auth.store'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { SwatchBook, Languages } from '@lucide/vue'

const authStore = useAuthStore()
const { locale, t } = useI18n()
const { theme } = useTheme()

const homeLocation = computed(() => {
  return authStore.isAuthenticated ? { name: 'home' } : { name: 'welcome' }
})

watch(locale, (value) => setLocale(value as SupportedLocale))
</script>

<template>
  <header class="flex gap-6 p-4 flex-row items-center">
    <div class="flex w-full flex-row items-center gap-8">
      <RouterLink class="text-inherit font-bold no-underline" :to="homeLocation">{{ t('app.name') }}</RouterLink>

      <nav v-if="authStore.isAuthenticated" class="hidden sm:flex items-center gap-4" :aria-label="t('navigation.main')">
        <RouterLink :to="{ name: 'home' }">{{ t('navigation.home') }}</RouterLink>
      </nav>
    </div>

    <div class="flex items-center gap-8">
      <div class="flex items-center gap-4">
        <Select :key="locale" v-model="theme" :aria-label="t('common.theme')" size="sm">
          <SelectTrigger>
            <span class="sr-only">{{ t('common.theme') }}</span>
            <SwatchBook />
            <span class="hidden sm:block">
              <SelectValue />
            </span>
          </SelectTrigger>
          <SelectContent :body-lock="false">
            <SelectItem value="system">{{ t('theme.system') }}</SelectItem>
            <SelectItem value="light">{{ t('theme.light') }}</SelectItem>
            <SelectItem value="dark">{{ t('theme.dark') }}</SelectItem>
          </SelectContent>
        </Select>

        <Select :key="locale" v-model="locale" :aria-label="t('common.language')" size="sm">
          <SelectTrigger>
            <span class="sr-only">{{ t('common.language') }}</span>
            <Languages />
            <span class="hidden sm:block">
              <SelectValue />
            </span>
          </SelectTrigger>
          <SelectContent :body-lock="false">
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="es">Español</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <AuthNavigation />
    </div>
  </header>
</template>
