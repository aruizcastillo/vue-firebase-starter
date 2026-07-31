<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useAuthStore } from '@/stores/auth.store'
import { useProfileStore } from '@/stores/profile.store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'

const authStore = useAuthStore()
const profileStore = useProfileStore()
const { t } = useI18n()
const displayName = ref('')
const saved = ref(false)
const validationError = ref<string | null>(null)

watch(
  () => profileStore.profile?.displayName,
  (currentDisplayName) => {
    displayName.value = currentDisplayName ?? ''
  },
  { immediate: true },
)

async function handleSubmit(): Promise<void> {
  saved.value = false
  validationError.value = null
  const normalizedDisplayName = displayName.value.trim()

  if (normalizedDisplayName.length > 80) {
    validationError.value = t('errors.nameTooLong')
    return
  }

  if (await profileStore.update(authStore.user, normalizedDisplayName)) {
    saved.value = true
  }
}
</script>

<template>
  <Card aria-labelledby="profile-settings-heading" class="w-full max-w-sm">
    <CardHeader class="flex flex-col items-center text-center">
      <CardTitle id="profile-settings-heading" class="text-xl font-bold">{{ t('profile.settings') }}</CardTitle>
    </CardHeader>
    <CardContent>
      <form id="profile-settings-form" @submit.prevent="handleSubmit">
        <FieldGroup class="grid w-full items-center gap-4">
          <Field class="flex flex-col">
            <FieldLabel for="profile-email">{{ t('common.email') }}</FieldLabel>
            <Input id="profile-email" :model-value="profileStore.profile?.email ?? ''" type="email" disabled />
          </Field>
          <Field class="flex flex-col">
            <FieldLabel for="display-name">{{ t('common.name') }}</FieldLabel>
            <Input id="display-name" v-model="displayName" type="text" autocomplete="name" maxlength="80" />
          </Field>
          <FieldError v-if="validationError || profileStore.error" class="form-error">
            {{ validationError ?? profileStore.error }}
          </FieldError>
          <p v-if="saved" class="form-success text-sm">{{ t('profile.updated') }}</p>
        </FieldGroup>
      </form>
    </CardContent>
    <CardFooter class="flex flex-col gap-2">
      <Button form="profile-settings-form" type="submit" class="w-full" :disabled="profileStore.updating || profileStore.loading || !profileStore.profile">
        {{ profileStore.updating ? t('buttons.saving') : profileStore.loading ? t('profile.loading') : t('buttons.save') }}
      </Button>
    </CardFooter>
  </Card>
</template>
