<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import AuthNavigation from '@/components/app-header/AuthNavigation.vue'
import ThemeDropdown from '@/components/app-header/ThemeDropdown.vue'
import LangDropdown from '@/components/app-header/LangDropdown.vue'

import { useAuthStore } from '@/stores/auth.store'

const authStore = useAuthStore()

const isAuthenticated = computed(() => authStore.isAuthenticated)

const homeLocation = computed(() => {
  return isAuthenticated.value ? { name: 'home' } : { name: 'welcome' }
})
</script>

<template>
  <header class="flex gap-6 p-4 items-center" :class="isAuthenticated ? 'flex-row' : 'flex-col sm:flex-row'" :aria-label="$t('navigation.main')">
    <div class="flex w-full flex-row items-center justify-between gap-8">
      <RouterLink class="text-inherit font-bold no-underline" :to="homeLocation">{{ $t('app.name') }}</RouterLink>
      <div class="flex sm:hidden items-center gap-4">
        <ThemeDropdown />
        <LangDropdown />
      </div>
    </div>

    <div class="flex items-center gap-4 self-end">
      <div class="hidden sm:flex items-center gap-4">
        <ThemeDropdown />
        <LangDropdown />
      </div>

      <AuthNavigation />
    </div>
  </header>
</template>
dd2c00ff
ffc400ff
