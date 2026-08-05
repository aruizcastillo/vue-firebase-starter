<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

import { useAuthStore } from '@/stores/auth.store'
import { useProfileStore } from '@/stores/profile.store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldError } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'

const authStore = useAuthStore()
const profileStore = useProfileStore()
const { t } = useI18n()
const error = ref<string | null>(null)
const deactivating = ref(false)

async function handleDeactivation(): Promise<void> {
  if (!authStore.user || !window.confirm(t('account.deactivateConfirm'))) return
  error.value = null
  deactivating.value = true
  const succeeded = await profileStore.updateStatus(authStore.user, 'deactivated')
  if (succeeded) {
    await authStore.signOut()
  } else {
    error.value = profileStore.operationError ?? t('errors.accountDeactivationFailed')
    toast.error(error.value)
  }
  deactivating.value = false
}
</script>

<template>
  <Card aria-labelledby="deactivate-account-heading" class="border-destructive">
    <CardHeader class="flex flex-col">
      <CardTitle id="deactivate-account-heading" class="text-xl font-bold">{{ t('account.deactivate') }}</CardTitle>
      <CardDescription>{{ t('account.deactivateIntro') }}</CardDescription>
    </CardHeader>
    <CardContent class="flex flex-col gap-2">
      <FieldError v-if="error" class="form-error">{{ error }}</FieldError>
      <Button type="button" variant="destructive" class="w-full" :disabled="deactivating || profileStore.loading" @click="handleDeactivation">
        <Spinner v-if="deactivating" data-icon="inline-start" />
        {{ deactivating ? t('buttons.deactivating') : t('buttons.deactivateAccount') }}
      </Button>
    </CardContent>
  </Card>
</template>
