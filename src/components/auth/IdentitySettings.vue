<script setup lang="ts">
import { Field as FormischField, Form, reset, setErrors, useForm } from '@formisch/vue'
import type { SubmitHandler } from '@formisch/vue'
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { createIdentitySettingsSchema } from '@/schemas/identity-settings.schema'
import { useAuthStore } from '@/stores/auth.store'
import { getFormischInputProps } from '@/utils/formisch-input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'vue-sonner'

const authStore = useAuthStore()
const { t } = useI18n()
const identitySettingsSchema = createIdentitySettingsSchema(t('errors.nameTooLong'), t('errors.nameUnchanged'), () => authStore.user?.displayName)
const identitySettingsForm = useForm({
  schema: identitySettingsSchema,
  validate: 'submit',
  revalidate: 'input',
})

watch(
  () => authStore.user?.displayName,
  (currentDisplayName) => {
    reset(identitySettingsForm, {
      initialInput: { displayName: currentDisplayName ?? '' },
    })
  },
  { immediate: true },
)

const handleSubmit: SubmitHandler<typeof identitySettingsSchema> = async ({ displayName }) => {
  setErrors(identitySettingsForm, { errors: null })

  const updated = await authStore.updateDisplayName(displayName)

  if (updated) {
    toast.success(t('identity.updated'))
  } else {
    const errorMessage = authStore.operationError ?? t('errors.operationFailed')
    setErrors(identitySettingsForm, { errors: [errorMessage] })
    toast.error(errorMessage)
  }
}
</script>

<template>
  <Card aria-labelledby="identity-settings-heading">
    <CardHeader class="flex flex-col">
      <CardTitle id="identity-settings-heading" class="text-xl font-bold">{{ t('identity.settings') }}</CardTitle>
    </CardHeader>
    <CardContent>
      <Form id="identity-settings-form" :of="identitySettingsForm" @submit="handleSubmit">
        <FieldGroup class="grid w-full items-center gap-4">
          <Field class="flex flex-col" data-disabled>
            <FieldLabel for="identity-email">{{ t('common.email') }}</FieldLabel>
            <Input id="identity-email" :model-value="authStore.user?.email ?? ''" type="email" disabled />
          </Field>
          <FormischField :of="identitySettingsForm" :path="['displayName']" v-slot="formField">
            <Field class="flex flex-col" :data-invalid="Boolean(formField.errors)">
              <FieldLabel for="display-name">{{ t('common.name') }}</FieldLabel>
              <Input id="display-name" v-model="formField.input" v-bind="getFormischInputProps(formField.props)" :input-ref="formField.props.ref" :aria-invalid="formField.errors ? true : undefined" type="text" autocomplete="name" maxlength="80" />
              <FieldError v-if="formField.errors" :errors="formField.errors" class="form-error" />
            </Field>
          </FormischField>
          <FieldError v-if="identitySettingsForm.errors" :errors="identitySettingsForm.errors" class="form-error" />
        </FieldGroup>
      </Form>
    </CardContent>
    <CardFooter class="flex flex-col gap-2">
      <Button form="identity-settings-form" type="submit" class="w-full" :disabled="authStore.identityUpdating || identitySettingsForm.isSubmitting || !authStore.user">
        <Spinner v-if="authStore.identityUpdating" data-icon="inline-start" />
        {{ authStore.identityUpdating ? t('buttons.saving') : t('buttons.save') }}
      </Button>
    </CardFooter>
  </Card>
</template>
