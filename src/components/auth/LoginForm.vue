<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'

const emit = defineEmits<{ success: [] }>()
const authStore = useAuthStore()
const { t } = useI18n()
const email = ref('')
const password = ref('')

async function handleSubmit(): Promise<void> {
  if (!email.value || !password.value) return
  if (await authStore.login(email.value.trim(), password.value)) emit('success')
}
async function handleGoogleLogin(): Promise<void> {
  if (await authStore.googleLogin()) emit('success')
}
</script>

<template>
  <Card class="w-full max-w-sm">
    <CardHeader class="flex flex-col items-center text-center">
      <CardTitle class="text-xl font-bold">{{ t('navigation.login') }}</CardTitle>
      <CardDescription>
        {{ t('auth.loginDescription') }}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <form id="login-form" @submit.prevent="handleSubmit">
        <FieldGroup class="grid w-full items-center gap-4">
          <Field class="flex flex-col">
            <FieldLabel for="login-email">{{ t('common.email') }}</FieldLabel>
            <Input id="login-email" v-model="email" type="email" autocomplete="email" required />
          </Field>
          <Field class="flex flex-col">
            <div class="flex items-center justify-between">
              <FieldLabel for="login-password">{{ t('common.password') }}</FieldLabel>
              <RouterLink to="/forgot-password" class="link-muted text-sm">
                {{ t('navigation.forgotPassword') }}
              </RouterLink>
            </div>
            <Input id="login-password" v-model="password" type="password" autocomplete="current-password" required />
          </Field>
          <FieldError v-if="authStore.error" class="form-error" role="alert">
            {{ authStore.error }}
          </FieldError>
        </FieldGroup>
      </form>
    </CardContent>
    <CardFooter class="flex flex-col gap-2">
      <Button form="login-form" type="submit" class="w-full" :disabled="authStore.authStatus === 'authenticating'">
        {{ authStore.authStatus === 'authenticating' ? t('buttons.loggingIn') : t('buttons.login') }}
      </Button>
      <Button type="button" variant="outline" class="w-full" :disabled="authStore.authStatus === 'authenticating'" @click="handleGoogleLogin">
        {{ t('buttons.continueWithGoogle') }}
      </Button>
      <CardAction class="pt-2 self-end">
        <RouterLink to="/register" class="link-muted text-sm">{{ t('navigation.signUp') }}</RouterLink>
      </CardAction>
    </CardFooter>
  </Card>
</template>
