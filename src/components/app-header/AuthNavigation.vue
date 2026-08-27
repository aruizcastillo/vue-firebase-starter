<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { useAuthStore } from '@/stores/auth.store'

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'

import { UserRoundCog, LogOut } from '@lucide/vue'

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
  <nav v-if="authStore.isAuthenticated" class="flex w-full items-center justify-between gap-4" :aria-label="t('navigation.user')">
    <DropdownMenu :modal="false">
      <DropdownMenuTrigger as-child>
        <button type="button" :aria-label="t('navigation.user')">
          <Avatar class="size-10 hover:ring-2 hover:ring-primary">
            <AvatarImage :src="authStore.user?.photoURL ?? ''" :alt="userLabel" />
            <AvatarFallback>
              {{ userLabel.charAt(0) }}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" :side-offset="6">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <span class="truncate text-nowrap text-muted-foreground">
              {{ userLabel }}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild class="w-full">
            <RouterLink :to="{ name: 'account-settings' }">
              <UserRoundCog />
              {{ t('account.settings') }}
            </RouterLink>
          </DropdownMenuItem>
          <DropdownMenuItem asChild class="w-full">
            <button type="button" :disabled="authStore.authStatus === 'signing-out'" @click="handleLogout" class="text-destructive hover:text-destructive!">
              <LogOut />
              {{ authStore.authStatus === 'signing-out' ? t('navigation.loggingOut') : t('navigation.logOut') }}
            </button>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  </nav>

  <nav v-else class="flex w-full items-center justify-between gap-2" :aria-label="t('navigation.authentication')">
    <Button asChild type="button" variant="outline">
      <RouterLink :to="{ name: 'login' }">{{ t('navigation.login') }}</RouterLink>
    </Button>
    <Button asChild type="button">
      <RouterLink :to="{ name: 'register' }">{{ t('navigation.signUp') }}</RouterLink>
    </Button>
  </nav>
</template>
