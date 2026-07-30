<script setup lang="ts">
import { onBeforeMount, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'

const authStore = useAuthStore()

const email = ref('')
const sent = ref(false)

onBeforeMount(() => {
  authStore.clearError()
})

async function handleSubmit(): Promise<void> {
  sent.value = false

  const succeeded = await authStore.sendPasswordReset(email.value.trim())

  if (succeeded) {
    sent.value = true
  }
}
</script>

<template>
  <section class="auth-card">
    <Card class="w-full max-w-sm">
      <CardHeader class="flex flex-col items-center text-center">
        <CardTitle class="text-xl font-bold">{{ $t('auth.resetPassword') }}</CardTitle>
      </CardHeader>
      <CardContent>
        <form id="forgot-password-form" @submit.prevent="handleSubmit">
          <FieldGroup class="grid w-full items-center gap-4">
            <Field class="flex flex-col">
              <FieldLabel for="reset-email">{{ $t('common.email') }}</FieldLabel>
              <Input id="reset-email" v-model="email" type="email" autocomplete="email" required />
            </Field>
            <FieldError v-if="authStore.error" class="form-error">
              {{ authStore.error }}
            </FieldError>
            <p v-if="sent" class="form-success text-sm">{{ $t('auth.resetEmailSent') }}</p>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter class="flex flex-col gap-2">
        <Button form="forgot-password-form" type="submit" class="w-full" :disabled="authStore.operationLoading">
          {{ authStore.operationLoading ? $t('buttons.sending') : $t('buttons.sendEmail') }}
        </Button>
        <CardAction class="pt-2 self-end">
          <RouterLink to="/login" class="link-muted text-sm">{{ $t('navigation.backToSignIn') }}</RouterLink>
        </CardAction>
      </CardFooter>
    </Card>
  </section>
</template>
