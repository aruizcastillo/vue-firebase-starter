<script setup lang="ts">
import { Field as FormischField, Form, reset, setErrors, useForm } from '@formisch/vue'
import type { SubmitHandler } from '@formisch/vue'
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useAuthStore } from '@/stores/auth.store'
import { useProfileStore } from '@/stores/profile.store'
import { createProfileSettingsSchema } from '@/schemas/profile-settings.schema'
import { getFormischInputProps } from '@/utils/formisch-input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'vue-sonner'

const authStore = useAuthStore()
const profileStore = useProfileStore()
const { t } = useI18n()
const profileSettingsSchema = createProfileSettingsSchema(t('errors.nameTooLong'), t('errors.nameUnchanged'), () => profileStore.profile?.displayName)
const profileSettingsForm = useForm({
  schema: profileSettingsSchema,
  validate: 'submit',
  revalidate: 'input',
})

watch(
  () => profileStore.profile?.displayName,
  (currentDisplayName) => {
    reset(profileSettingsForm, {
      initialInput: { displayName: currentDisplayName ?? '' },
    })
  },
  { immediate: true },
)

const handleSubmit: SubmitHandler<typeof profileSettingsSchema> = async ({ displayName }) => {
  setErrors(profileSettingsForm, { errors: null })

  const updated = await profileStore.update(authStore.user, displayName)

  if (updated) {
    toast.success(t('profile.updated'))
  } else {
    const errorMessage = profileStore.operationError ?? t('errors.operationFailed')
    setErrors(profileSettingsForm, { errors: [errorMessage] })
    toast.error(errorMessage)
  }
}
</script>

<template>
  <Card aria-labelledby="profile-settings-heading">
    <CardHeader class="flex flex-col">
      <CardTitle id="profile-settings-heading" class="text-xl font-bold">{{ t('profile.settings') }}</CardTitle>
    </CardHeader>
    <CardContent>
      <Form id="profile-settings-form" :of="profileSettingsForm" @submit="handleSubmit">
        <FieldGroup class="grid w-full items-center gap-4">
          <Field class="flex flex-col" data-disabled>
            <FieldLabel for="profile-email">{{ t('common.email') }}</FieldLabel>
            <Input id="profile-email" :model-value="profileStore.profile?.email ?? ''" type="email" disabled />
          </Field>
          <FormischField :of="profileSettingsForm" :path="['displayName']" v-slot="formField">
            <Field class="flex flex-col" :data-invalid="Boolean(formField.errors)">
              <FieldLabel for="display-name">{{ t('common.name') }}</FieldLabel>
              <Input id="display-name" v-model="formField.input" v-bind="getFormischInputProps(formField.props)" :input-ref="formField.props.ref" :aria-invalid="formField.errors ? true : undefined" type="text" autocomplete="name" maxlength="80" />
              <FieldError v-if="formField.errors" :errors="formField.errors" class="form-error" />
            </Field>
          </FormischField>
          <FieldError v-if="profileSettingsForm.errors" :errors="profileSettingsForm.errors" class="form-error" />
        </FieldGroup>
      </Form>
    </CardContent>
    <CardFooter class="flex flex-col gap-2">
      <Button form="profile-settings-form" type="submit" class="w-full" :disabled="profileStore.updating || profileSettingsForm.isSubmitting || !profileStore.profile">
        <Spinner v-if="profileStore.updating" />
        {{ profileStore.updating ? t('buttons.saving') : t('buttons.save') }}
      </Button>
    </CardFooter>
  </Card>
</template>
