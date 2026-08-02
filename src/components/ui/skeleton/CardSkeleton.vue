<script setup lang="ts">
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

withDefaults(
  defineProps<{
    descriptionLines?: number
    fields?: number
    actions?: number
  }>(),
  {
    descriptionLines: 1,
    fields: 1,
    actions: 1,
  },
)
</script>

<template>
  <Card>
    <CardHeader class="flex flex-col items-center">
      <Skeleton class="h-6 w-40" />

      <div class="flex w-full flex-col items-center gap-2">
        <Skeleton
          v-for="line in descriptionLines"
          :key="`description-${line}`"
          class="h-4"
          :class="line % 2 === 0 ? 'w-2/3' : 'w-3/4'"
        />
      </div>
    </CardHeader>

    <CardContent v-if="fields > 0">
      <div class="grid w-full gap-4">
        <div
          v-for="field in fields"
          :key="`field-${field}`"
          class="flex flex-col gap-2"
        >
          <Skeleton class="h-4 w-28" />
          <Skeleton class="h-9 w-full" />
        </div>
      </div>
    </CardContent>

    <CardFooter v-if="actions > 0" class="flex flex-col gap-2">
      <Skeleton
        v-for="action in actions"
        :key="`action-${action}`"
        class="h-9 w-full"
      />
    </CardFooter>
  </Card>
</template>
