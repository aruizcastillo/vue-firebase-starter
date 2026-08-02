<script setup lang="ts">
import { computed, onBeforeMount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

import { useAuthStore } from '@/stores/auth.store'
import { getPasswordPolicyMessage } from '@/utils/password-policy'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'

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
  <Card>
    <CardHeader class="flex flex-col items-center text-center">
      <CardTitle class="text-xl font-bold">{{ t('navigation.signUp') }}</CardTitle>
      <CardDescription class="text-muted-foreground font-">
        {{ t('auth.registerDescription') }}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <form id="register-form" @submit.prevent="handleSubmit">
        <FieldGroup class="grid w-full items-center gap-4">
          <Field class="flex flex-col">
            <FieldLabel for="register-email">{{ t('common.email') }}</FieldLabel>
            <Input id="register-email" v-model="email" type="email" autocomplete="email" required />
          </Field>
          <Field class="flex flex-col">
            <FieldLabel for="register-password">{{ t('common.password') }}</FieldLabel>
            <Input id="register-password" v-model="password" type="password" autocomplete="new-password" required />
          </Field>
          <Field class="flex flex-col">
            <FieldLabel for="confirm-password">{{ t('common.confirmNewPassword') }}</FieldLabel>
            <Input id="confirm-password" v-model="confirmPassword" type="password" autocomplete="new-password" required />
          </Field>
          <FieldError v-if="validationError || authStore.error" class="form-hint">
            {{ passwordPolicyMessage }}
          </FieldError>
          <FieldError v-if="validationError || authStore.error" class="form-error" role="alert">
            {{ validationError ?? authStore.error }}
          </FieldError>
        </FieldGroup>
      </form>
    </CardContent>
    <CardFooter class="flex flex-col gap-2">
      <Button form="register-form" type="submit" class="w-full" :disabled="submitting">
        <Spinner v-if="creatingAccount" />
        {{ checkingPassword ? t('buttons.checkingPassword') : creatingAccount ? t('buttons.creatingAccount') : t('navigation.createAccount') }}
      </Button>
      <Button type="button" variant="outline" class="w-full" :disabled="submitting" @click="handleGoogleRegistration">
        {{ t('buttons.continueWithGoogle') }}
      </Button>
      <CardAction class="pt-2 self-end">
        <RouterLink to="/login" class="link-muted text-sm">{{ $t('navigation.alreadyHaveAccount') }}</RouterLink>
      </CardAction>
    </CardFooter>
  </Card>
</template>
