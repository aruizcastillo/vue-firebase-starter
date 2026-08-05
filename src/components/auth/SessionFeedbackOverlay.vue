<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { getSafeRedirect } from '@/router/session-policy'
import { useAuthStore } from '@/stores/auth.store'
import { useSessionStore } from '@/stores/session.store'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { PageContainer } from '@/components/ui/page'

const authStore = useAuthStore()
const sessionStore = useSessionStore()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const isPreparingSession = ref(false)

const visible = computed(() => sessionStore.isBlocking || isPreparingSession.value)
const showError = computed(() => sessionStore.phase === 'error' && !isPreparingSession.value)
const loadingMessage = computed(() => {
  if (isPreparingSession.value) return t('session.preparing')
  if (sessionStore.phase === 'restoring-auth') return t('session.restoringAuth')
  if (sessionStore.phase === 'loading-profile') return t('session.loadingProfile')

  return ''
})

async function retry(): Promise<void> {
  isPreparingSession.value = true

  try {
    const succeeded = await sessionStore.retry()

    if (succeeded) {
      const redirect = getSafeRedirect(route.query.redirect)
      await router.replace(redirect ?? (authStore.user ? { name: 'home' } : { name: 'welcome' }))
    }
  } finally {
    isPreparingSession.value = false
  }
}

async function signOut(): Promise<void> {
  isPreparingSession.value = true

  try {
    if (await authStore.signOut()) {
      await sessionStore.ensureReady()
      await router.replace({ name: 'welcome' })
    }
  } finally {
    isPreparingSession.value = false
  }
}
</script>

<template>
  <PageContainer centered v-if="visible" class="fixed inset-0 z-50 bg-background/90 p-4 backdrop-blur-sm">
    <Card v-if="showError" class="w-full max-w-md" role="alert" aria-live="assertive">
      <CardHeader class="text-center">
        <CardTitle>{{ t('session.errorTitle') }}</CardTitle>
        <CardDescription>{{ t('session.errorDescription') }}</CardDescription>
      </CardHeader>
      <CardContent v-if="sessionStore.error" class="text-destructive text-sm text-center">
        {{ sessionStore.error }}
      </CardContent>
      <CardFooter class="flex flex-col gap-2">
        <Button type="button" class="w-full" @click="retry">{{ t('buttons.retry') }}</Button>
        <Button type="button" variant="outline" class="w-full" @click="signOut">{{ t('navigation.signOut') }}</Button>
      </CardFooter>
    </Card>

    <div v-else class="flex flex-col items-center gap-3" role="status" aria-live="polite">
      <Spinner class="size-6" />
      <p class="text-muted-foreground text-sm">{{ loadingMessage }}</p>
    </div>
  </PageContainer>
</template>
