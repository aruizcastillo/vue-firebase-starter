<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useTheme, type Theme } from '@/composables/useTheme'

import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

import { SwatchBook, Sun, Moon } from '@lucide/vue'

const { locale, t } = useI18n()
const { theme } = useTheme()

const themeIcons = { system: SwatchBook, light: Sun, dark: Moon } satisfies Record<Theme, typeof SwatchBook>
const themeIcon = computed(() => themeIcons[theme.value])
</script>

<template>
  <DropdownMenu :key="locale" :modal="false" :aria-label="t('common.language')">
    <DropdownMenuTrigger>
      <Button type="button" variant="ghost" class="flex items-center gap-2">
        <component :is="themeIcon" aria-hidden="true" />
        <span class="hidden md:block">{{ t(`theme.${theme}`) }}</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuRadioGroup v-model="theme">
        <DropdownMenuRadioItem value="system">
          <SwatchBook />
          {{ t('theme.system') }}
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="light">
          <Sun />
          {{ t('theme.light') }}
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="dark">
          <Moon />
          {{ t('theme.dark') }}
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
