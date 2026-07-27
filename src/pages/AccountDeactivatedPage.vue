<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth.store'
import { useProfileStore } from '@/stores/profile.store'

const authStore = useAuthStore()
const profileStore = useProfileStore()
const router = useRouter()
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
    error.value = profileStore.error ?? 'The account could not be reactivated.'
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
    <h1>{{ isSuspended ? 'Account suspended' : 'Account deactivated' }}</h1>
    <p v-if="isSuspended">
      This account has been suspended. Contact support if you think this is a mistake.
    </p>
    <p v-else>
      This account is deactivated. Its data is preserved but is unavailable until you reactivate it.
    </p>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <div class="auth-links">
      <button v-if="!isSuspended" type="button" :disabled="reactivating" @click="reactivate">
        {{ reactivating ? 'Reactivating…' : 'Reactivate account' }}
      </button>
      <button type="button" :disabled="reactivating" @click="signOut">Sign out</button>
    </div>
  </section>
</template>
