<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useAuthStore } from '@/stores/auth.store'
import { useProfileStore } from '@/stores/profile.store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
  <Card aria-labelledby="profile-settings-heading">
    <CardHeader>
      <CardTitle id="profile-settings-heading">{{ t('profile.settings') }}</CardTitle>
    </CardHeader>
    <CardContent>
      <form id="profile-settings-form" @submit.prevent="handleSubmit">
        <div class="grid gap-4">
          <div class="grid gap-2">
            <Label for="profile-email">{{ t('common.email') }}</Label>
            <Input
              id="profile-email"
              :model-value="profileStore.profile?.email ?? ''"
              type="email"
              disabled
            />
          </div>
          <div class="grid gap-2">
            <Label for="display-name">{{ t('common.name') }}</Label>
            <Input
              id="display-name"
              v-model="displayName"
              type="text"
              autocomplete="name"
              maxlength="80"
            />
          </div>
          <p v-if="validationError || profileStore.error" class="form-error" role="alert">
            {{ validationError ?? profileStore.error }}
          </p>
          <p v-if="saved" class="form-success">{{ t('profile.updated') }}</p>
        </div>
      </form>
    </CardContent>
    <CardFooter>
      <Button
        form="profile-settings-form"
        type="submit"
        :disabled="profileStore.updating || profileStore.loading || !profileStore.profile"
      >
        {{
          profileStore.updating
            ? t('buttons.saving')
            : profileStore.loading
              ? t('profile.loading')
              : t('buttons.save')
        }}
      </Button>
    </CardFooter>
  </Card>
</template>
