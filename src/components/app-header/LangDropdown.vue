<script setup lang="ts">
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { setLocale, type SupportedLocale } from '@/i18n'

import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

import { Languages } from '@lucide/vue'

const { locale, t } = useI18n()

watch(locale, (value) => setLocale(value as SupportedLocale))
</script>

<template>
  <DropdownMenu :key="locale" v-model="locale" :modal="false" :aria-label="t('common.language')">
    <DropdownMenuTrigger>
      <Button type="button" variant="ghost" class="flex items-center gap-2">
        <Languages />
        <span>{{ t(`languages.${locale}`) }}</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuRadioGroup v-model="locale">
        <DropdownMenuRadioItem value="en">English</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="es">Español</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
