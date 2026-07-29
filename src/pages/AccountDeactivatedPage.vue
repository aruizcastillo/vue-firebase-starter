<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { useAuthStore } from '@/stores/auth.store'
import { useProfileStore } from '@/stores/profile.store'

const authStore = useAuthStore()
const profileStore = useProfileStore()
const router = useRouter()
const { t } = useI18n()
const error = ref<string | null>(null)
const reactivating = ref(false)
const isSuspended = profileStore.profile?.status === 'suspended'

async function reactivate(): Promise<void> {
  error.value = null
  reactivating.value = true
  const succeeded = await profileStore.updateStatus(authStore.user, 'active')

  if (succeeded) {
    await router.replace({ name: 'home' })
  } else {
    error.value = profileStore.error ?? t('errors.accountReactivationFailed')
  }
  reactivating.value = false
}

async function signOut(): Promise<void> {
  await authStore.signOut()
  await router.replace({ name: 'welcome' })
}
</script>

<template>
  <section class="auth-card">
    <h1>{{ isSuspended ? t('profile.accountSuspended') : t('profile.accountDeactivated') }}</h1>
    <p v-if="isSuspended">
      {{ t('profile.suspendedDescription') }}
    </p>
    <p v-else>
      {{ t('profile.deactivatedDescription') }}
    </p>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <div class="auth-links">
      <button v-if="!isSuspended" type="button" :disabled="reactivating" @click="reactivate">
        {{ reactivating ? t('buttons.reactivating') : t('buttons.reactivateAccount') }}
      </button>
      <button type="button" :disabled="reactivating" @click="signOut">
        {{ t('navigation.signOut') }}
      </button>
    </div>
  </section>
</template>
