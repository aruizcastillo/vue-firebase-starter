<script setup lang="ts">
import { computed } from 'vue'

import { authConfig } from '@/config/auth.config'
import { useAuthStore } from '@/stores/auth.store'
import AccountStatusSettings from '@/components/auth/AccountStatusSettings.vue'
import EmailSettings from '@/components/auth/EmailSettings.vue'
import PasswordSettings from '@/components/auth/PasswordSettings.vue'

const authStore = useAuthStore()
const emailPasswordProvider = computed(() => authStore.user?.providerData.some((provider) => provider.providerId === 'password') ?? false)
</script>

<template>
  <div class="flex flex-col gap-md">
    <EmailSettings />
    <PasswordSettings v-if="emailPasswordProvider" />
    <AccountStatusSettings v-if="authConfig.requiresAccountStatus" />
  </div>
</template>
