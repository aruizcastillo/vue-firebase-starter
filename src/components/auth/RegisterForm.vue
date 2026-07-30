<script setup lang="ts">
import { computed, onBeforeMount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

import { useAuthStore } from '@/stores/auth.store'
import { getPasswordPolicyMessage } from '@/utils/password-policy'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const emit = defineEmits<{
  success: []
}>()

const authStore = useAuthStore()
const { t } = useI18n()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const validationError = ref<string | null>(null)
const passwordPolicyMessage = ref<string | null>(null)
const checkingPassword = computed(() => authStore.operationLoading)
const creatingAccount = computed(() => authStore.authStatus === 'authenticating')
const submitting = computed(() => checkingPassword.value || creatingAccount.value)

onBeforeMount(() => {
  void loadPasswordPolicy()
})

async function loadPasswordPolicy(): Promise<void> {
  const passwordStatus = await authStore.validateRegistrationPassword('')

  if (passwordStatus && !passwordStatus.isValid) {
    passwordPolicyMessage.value = getPasswordPolicyMessage(passwordStatus)
  }
}

async function handleSubmit(): Promise<void> {
  validationError.value = null
  authStore.clearError()

  if (password.value !== confirmPassword.value) {
    validationError.value = t('auth.passwordsDoNotMatch')
    return
  }

  const passwordStatus = await authStore.validateRegistrationPassword(password.value)

  if (!passwordStatus) {
    return
  }

  if (!passwordStatus.isValid) {
    validationError.value = getPasswordPolicyMessage(passwordStatus)
    return
  }

  const succeeded = await authStore.register(email.value.trim(), password.value)

  if (succeeded) {
    emit('success')
  }
}

async function handleGoogleRegistration(): Promise<void> {
  validationError.value = null
  authStore.clearError()

  const succeeded = await authStore.googleLogin()

  if (succeeded) {
    emit('success')
  }
}
</script>

<template>
  <Card class="w-full max-w-sm">
    <CardHeader>
      <CardTitle>{{ t('navigation.signUp') }}</CardTitle>
      <CardDescription>
        {{ t('auth.registerDescription') }}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <form id="register-form" @submit.prevent="handleSubmit">
        <div class="grid w-full items-center gap-4">
          <div class="flex flex-col space-y-1.5">
            <Label for="register-email">{{ t('common.email') }}</Label>
            <Input id="register-email" v-model="email" type="email" autocomplete="email" required />
          </div>
          <div class="flex flex-col space-y-1.5">
            <Label for="register-password">{{ t('common.password') }}</Label>
            <Input
              id="register-password"
              v-model="password"
              type="password"
              autocomplete="new-password"
              required
            />
          </div>
          <div class="flex flex-col space-y-1.5">
            <Label for="confirm-password">{{ t('common.confirmNewPassword') }}</Label>
            <Input
              id="confirm-password"
              v-model="confirmPassword"
              type="password"
              autocomplete="new-password"
              required
            />
          </div>
          <CardDescription v-if="validationError || authStore.error" class="form-hint">
            {{ passwordPolicyMessage }}
          </CardDescription>
          <CardDescription v-if="validationError || authStore.error" class="form-error" role="alert">
            {{ validationError ?? authStore.error }}
          </CardDescription>
        </div>
      </form>
    </CardContent>
    <CardFooter class="flex flex-col gap-2">
      <Button form="register-form" type="submit" class="w-full" :disabled="submitting">
        {{
          checkingPassword
            ? t('buttons.checkingPassword')
            : creatingAccount
              ? t('buttons.creatingAccount')
              : t('navigation.signUp')
        }}
      </Button>
      <Button
        type="button"
        variant="outline"
        class="w-full"
        :disabled="submitting"
        @click="handleGoogleRegistration"
      >
        {{ t('buttons.continueWithGoogle') }}
      </Button>
      <CardAction>
        <Button variant="link" as-child class="text-muted-foreground">
          <RouterLink to="/login">{{ $t('navigation.alreadyHaveAccount') }}</RouterLink>
        </Button>
      </CardAction>
    </CardFooter>
  </Card>
</template>
