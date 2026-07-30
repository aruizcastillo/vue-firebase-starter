<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'

import AccountSettings from '@/components/auth/AccountSettings.vue'
import ProfileSettings from '@/components/auth/ProfileSettings.vue'

const { t } = useI18n()
</script>

<template>
  <section class="account-settings-page">
    <h1>{{ t('account.settings') }}</h1>
    <ProfileSettings />
    <AccountSettings />
    <RouterLink to="/">{{ t('navigation.backToHome') }}</RouterLink>
  </section>
</template>
