<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useAuthStore } from '@/stores/auth.store'
import { useProfileStore } from '@/stores/profile.store'

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
  <section class="settings-section" aria-labelledby="profile-settings-heading">
    <h2 id="profile-settings-heading">{{ t('profile.settings') }}</h2>
    <form class="settings-form" @submit.prevent="handleSubmit">
      <div class="field">
        <label for="profile-email">{{ t('common.email') }}</label>
        <input
          id="profile-email"
          :value="profileStore.profile?.email ?? ''"
          type="email"
          disabled
        />
      </div>
      <div class="field">
        <label for="display-name">{{ t('common.name') }}</label>
        <input
          id="display-name"
          v-model="displayName"
          type="text"
          autocomplete="name"
          maxlength="80"
        />
      </div>
      <p v-if="validationError || profileStore.error" class="form-error">
        {{ validationError ?? profileStore.error }}
      </p>
      <p v-if="saved" class="form-success">{{ t('profile.updated') }}</p>
      <button
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
      </button>
    </form>
  </section>
</template>
