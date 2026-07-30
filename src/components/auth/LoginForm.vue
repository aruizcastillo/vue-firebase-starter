<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  CardAction,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
    <CardHeader>
      <CardTitle>{{ t('navigation.login') }}</CardTitle>
      <CardDescription>
        {{ t('auth.loginDescription') }}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <form id="login-form" @submit.prevent="handleSubmit">
        <div class="grid w-full items-center gap-4">
          <div class="flex flex-col space-y-1.5">
            <Label for="login-email">{{ t('common.email') }}</Label>
            <Input id="login-email" v-model="email" type="email" autocomplete="email" required />
          </div>
          <div class="flex flex-col space-y-1.5">
            <div class="flex items-center justify-between">
              <Label for="login-password">{{ t('common.password') }}</Label>
              <CardAction>
                <Button variant="link" as-child class="text-muted-foreground">
                  <RouterLink to="/forgot-password">
                    {{ t('navigation.forgotPassword') }}
                  </RouterLink>
                </Button>
              </CardAction>
            </div>
            <Input
              id="login-password"
              v-model="password"
              type="password"
              autocomplete="current-password"
              required
            />
          </div>
          <p v-if="authStore.error" class="form-error" role="alert">{{ authStore.error }}</p>
        </div>
      </form>
    </CardContent>
    <CardFooter class="flex flex-col gap-2">
      <Button
        form="login-form"
        type="submit"
        class="w-full"
        :disabled="authStore.authStatus === 'authenticating'"
      >
        {{
          authStore.authStatus === 'authenticating' ? t('buttons.loggingIn') : t('buttons.login')
        }}
      </Button>
      <Button
        type="button"
        variant="outline"
        class="w-full"
        :disabled="authStore.authStatus === 'authenticating'"
        @click="handleGoogleLogin"
      >
        {{ t('buttons.continueWithGoogle') }}
      </Button>
      <CardAction>
        <Button variant="link" as-child class="text-muted-foreground">
          <RouterLink to="/register">{{ t('navigation.signUp') }}</RouterLink>
        </Button>
      </CardAction>
    </CardFooter>
  </Card>
</template>
