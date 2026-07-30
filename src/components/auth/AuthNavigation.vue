<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { useAuthStore } from '@/stores/auth.store'
import { useProfileStore } from '@/stores/profile.store'

const router = useRouter()
const authStore = useAuthStore()
const profileStore = useProfileStore()
const { t } = useI18n()

const userLabel = computed(
  () => profileStore.profile?.displayName || authStore.user?.email || t('common.user'),
)

async function handleLogout(): Promise<void> {
  const succeeded = await authStore.signOut()
  if (succeeded) await router.replace({ name: 'welcome' })
}
</script>

<template>
  <nav v-if="authStore.isAuthenticated" class="auth-navigation" :aria-label="t('navigation.user')">
    <RouterLink class="auth-navigation__user" :to="{ name: 'account-settings' }">{{
      userLabel
    }}</RouterLink>
    <button type="button" :disabled="authStore.authStatus === 'signing-out'" @click="handleLogout">
      {{
        authStore.authStatus === 'signing-out'
          ? t('navigation.signingOut')
          : t('navigation.signOut')
      }}
    </button>
  </nav>

  <nav v-else class="auth-navigation" :aria-label="t('navigation.authentication')">
    <RouterLink :to="{ name: 'login' }">{{ t('navigation.login') }}</RouterLink>
    <RouterLink :to="{ name: 'register' }">{{ t('navigation.signUp') }}</RouterLink>
  </nav>
</template>
