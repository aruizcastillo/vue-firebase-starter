<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

import { useAuthStore } from '@/stores/auth.store'
import { useProfileStore } from '@/stores/profile.store'

const authStore = useAuthStore()
const profileStore = useProfileStore()

const displayName = ref('')
const saved = ref(false)
const validationError = ref<string | null>(null)

watch(
  () => profileStore.profile?.displayName,
  (currentDisplayName) => {
    displayName.value = currentDisplayName ?? ''
  },
  {
    immediate: true,
  },
)

async function handleSubmit(): Promise<void> {
  saved.value = false
  validationError.value = null

  const normalizedDisplayName = displayName.value.trim()

  if (normalizedDisplayName.length > 80) {
    validationError.value = 'The name cannot exceed 80 characters.'
    return
  }

  const succeeded = await profileStore.update(authStore.user, normalizedDisplayName)

  if (succeeded) {
    saved.value = true
  }
}
</script>

<template>
  <section class="profile-page">
    <h1>Profile</h1>

    <form class="profile-form" @submit.prevent="handleSubmit">
      <div class="field">
        <label for="profile-email"> Email address </label>

        <input
          id="profile-email"
          :value="profileStore.profile?.email ?? ''"
          type="email"
          disabled
        />
      </div>

      <div class="field">
        <label for="display-name"> Name </label>

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

      <p v-if="saved" class="form-success">Profile updated.</p>

      <button
        type="submit"
        :disabled="profileStore.updating || profileStore.loading || !profileStore.profile"
      >
        {{ profileStore.updating ? 'Saving…' : profileStore.loading ? 'Loading profile…' : 'Save' }}
      </button>
    </form>

    <RouterLink to="/"> Back to home </RouterLink>
  </section>
</template>
