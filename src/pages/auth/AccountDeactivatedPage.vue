<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { useAuthStore } from '@/stores/auth.store'
import { useProfileStore } from '@/stores/profile.store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldError } from '@/components/ui/field'
import { PageContainer } from '@/components/ui/page'

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
  <PageContainer centered>
    <Card class="w-full max-w-sm">
      <CardHeader class="flex flex-col items-center text-center">
        <CardTitle class="text-xl font-bold">{{ isSuspended ? t('account.suspended') : t('account.deactivated') }}</CardTitle>
        <CardDescription>{{ isSuspended ? t('account.suspendedDescription') : t('account.deactivatedDescription') }}</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-2">
        <FieldError v-if="error" class="form-error">{{ error }}</FieldError>
        <Button v-if="!isSuspended" type="button" class="w-full" :disabled="reactivating" @click="reactivate">
          {{ reactivating ? t('buttons.reactivating') : t('buttons.reactivateAccount') }}
        </Button>
        <Button type="button" variant="outline" class="w-full" :disabled="reactivating" @click="signOut">
          {{ t('navigation.signOut') }}
        </Button>
      </CardContent>
    </Card>
  </PageContainer>
</template>
