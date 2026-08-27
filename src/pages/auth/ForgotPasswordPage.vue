<script setup lang="ts">
import { Field as FormischField, Form, setErrors, useForm } from '@formisch/vue'
import type { SubmitHandler } from '@formisch/vue'
import { onBeforeMount } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

import { useAuthStore } from '@/stores/auth.store'
import { createPasswordResetSchema } from '@/schemas/auth-forms.schema'
import { getFormischInputProps } from '@/utils/formisch-input'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { PageContainer } from '@/components/ui/page'
import { toast } from 'vue-sonner'

const authStore = useAuthStore()
const { t } = useI18n()
const passwordResetSchema = createPasswordResetSchema({
  emailRequired: t('errors.emailRequired'),
  invalidEmail: t('errors.invalidEmail'),
})
const passwordResetForm = useForm({
  schema: passwordResetSchema,
  validate: 'submit',
  revalidate: 'input',
})

onBeforeMount(() => {
  authStore.clearError()
})

const handleSubmit: SubmitHandler<typeof passwordResetSchema> = async ({ email }) => {
  setErrors(passwordResetForm, { errors: null })

  const succeeded = await authStore.sendPasswordReset(email)

  if (succeeded) {
    toast.success(t('auth.resetEmailSent'))
    return
  }

  const errorMessage = authStore.operationError ?? t('errors.operationFailed')
  setErrors(passwordResetForm, { errors: [errorMessage] })
  toast.error(errorMessage)
}
</script>

<template>
  <PageContainer centered>
    <Card class="w-full max-w-sm">
      <CardHeader class="flex flex-col">
        <CardTitle class="text-xl font-bold">{{ $t('auth.resetPassword') }}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form id="forgot-password-form" :of="passwordResetForm" @submit="handleSubmit">
          <FieldGroup class="grid w-full items-center gap-4">
            <FormischField :of="passwordResetForm" :path="['email']" v-slot="formField">
              <Field class="flex flex-col" :data-invalid="Boolean(formField.errors)">
                <FieldLabel for="reset-email">{{ $t('common.email') }}</FieldLabel>
                <Input id="reset-email" v-model="formField.input" v-bind="getFormischInputProps(formField.props)" :input-ref="formField.props.ref" :aria-invalid="formField.errors ? true : undefined" type="email" autocomplete="email" />
                <FieldError v-if="formField.errors" :errors="formField.errors" class="form-error" />
              </Field>
            </FormischField>
            <FieldError v-if="passwordResetForm.errors" :errors="passwordResetForm.errors" class="form-error" />
          </FieldGroup>
        </Form>
      </CardContent>
      <CardFooter class="flex flex-col gap-2">
        <Button form="forgot-password-form" type="submit" class="w-full" :disabled="authStore.operationLoading">
          {{ authStore.operationLoading ? $t('buttons.sending') : $t('buttons.sendEmail') }}
        </Button>
        <CardAction class="pt-2 self-end">
          <RouterLink to="/login" class="link-muted text-sm">{{ $t('navigation.backToLogin') }}</RouterLink>
        </CardAction>
      </CardFooter>
    </Card>
  </PageContainer>
</template>
