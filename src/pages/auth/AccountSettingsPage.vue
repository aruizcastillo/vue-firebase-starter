<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import AccountSettings from '@/components/auth/AccountSettings.vue'
import ProfileSettings from '@/components/auth/ProfileSettings.vue'

import { PageContainer } from '@/components/ui/page'

const { t } = useI18n()
</script>

<template>
  <PageContainer centered>
    <div class="flex flex-row items-center justify-between w-full max-w-md">
      <h1 class="text-xl font-bold">{{ t('account.settings') }}</h1>
    </div>

    <ProfileSettings class="w-full max-w-md" />
    <AccountSettings class="w-full max-w-md" />
  </PageContainer>
</template>
