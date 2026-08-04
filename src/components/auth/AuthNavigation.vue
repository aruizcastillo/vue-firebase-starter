<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { useAuthStore } from '@/stores/auth.store'

import { Item, ItemMedia, ItemContent, ItemTitle, ItemActions } from '@/components/ui/item'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'

import { EllipsisVertical } from '@lucide/vue'

const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()

const userLabel = computed(() => authStore.user?.displayName || authStore.user?.email || t('common.user'))

async function handleLogout(): Promise<void> {
  const succeeded = await authStore.signOut()
  if (succeeded) await router.replace({ name: 'welcome' })
}
</script>

<template>
  <nav v-if="authStore.isAuthenticated" class="flex w-full items-center justify-between gap-4 md:w-auto md:justify-start" :aria-label="t('navigation.user')">
    <Item size="sm" class="p-0 w-max">
      <ItemMedia>
        <Avatar class="size-9">
          <!-- Reemplazar por photoURL con fallback a inicial de 1. nombre o 2. email -->
          <AvatarImage :src="authStore.user?.photoURL" />
          <AvatarFallback>{{ userLabel.charAt(0) }}</AvatarFallback>
        </Avatar>
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          <span class="max-w-23 truncate">{{ userLabel }}</span>
        </ItemTitle>
      </ItemContent>
      <ItemActions>
        <DropdownMenu :modal="false">
          <DropdownMenuTrigger>
            <Button size="icon-sm" variant="ghost" class="rounded-full" aria-label="User menu">
              <EllipsisVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent :collisionPadding="25">
            <DropdownMenuItem>
              <RouterLink class="block max-w-64 truncate text-inherit" :to="{ name: 'account-settings' }">{{ t('account.settings') }}</RouterLink>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <button type="button" :disabled="authStore.authStatus === 'signing-out'" @click="handleLogout">
                {{ authStore.authStatus === 'signing-out' ? t('navigation.signingOut') : t('navigation.signOut') }}
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ItemActions>
    </Item>
  </nav>

  <nav v-else class="flex w-full items-center justify-between gap-2 md:w-auto md:justify-start" :aria-label="t('navigation.authentication')">
    <Button type="button" variant="outline" class="">
      <RouterLink :to="{ name: 'login' }">{{ t('navigation.login') }}</RouterLink>
    </Button>
    <Button type="button" class="">
      <RouterLink :to="{ name: 'register' }">{{ t('navigation.signUp') }}</RouterLink>
    </Button>
  </nav>
</template>
