<script setup lang="ts">
import { onBeforeMount, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

import { useAuthStore } from '@/stores/auth.store'

const authStore = useAuthStore()

const displayName = ref('')
const saved = ref(false)
const validationError = ref<string | null>(null)

onBeforeMount(() => {
  authStore.clearError()
})

watch(
  () => authStore.profile?.displayName,
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

  const succeeded = await authStore.updateProfile(normalizedDisplayName)

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

        <input id="profile-email" :value="authStore.profile?.email ?? ''" type="email" disabled />
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

      <p v-if="validationError || authStore.error" class="form-error">
        {{ validationError ?? authStore.error }}
      </p>

      <p v-if="saved" class="form-success">Profile updated.</p>

      <button
        type="submit"
        :disabled="authStore.operationLoading || authStore.profileLoading || !authStore.profile"
      >
        {{
          authStore.operationLoading
            ? 'Saving…'
            : authStore.profileLoading
              ? 'Loading profile…'
              : 'Save'
        }}
      </button>
    </form>

    <RouterLink to="/"> Back to home </RouterLink>
  </section>
</template>
