<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'

import AccountSettings from '@/components/auth/AccountSettings.vue'
import ProfileSettings from '@/components/auth/ProfileSettings.vue'

const { t } = useI18n()
</script>

<template>
  <section class="flex flex-col gap-4">
    <div class="flex flex-row items-center justify-between">
      <h1 class="text-xl font-bold">{{ t('account.settings') }}</h1>
        <RouterLink to="/" class="link-muted text-sm">{{ t('navigation.backToHome') }}</RouterLink>
    </div>

    <ProfileSettings />
    <AccountSettings />
  </section>
</template>
