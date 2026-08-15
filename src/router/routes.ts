import type { RouteRecordRaw } from 'vue-router'

import { authConfig } from '@/config/auth.config'
import type { DocumentMetaKey } from '@/router/meta'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/AppLayout.vue'),
    meta: {
      requiresAuth: true,
      title: 'metadata.home.title',
      description: 'metadata.home.description',
    },
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/pages/HomePage.vue'),
      },
      {
        path: 'account/settings',
        name: 'account-settings',
        component: () => import('@/pages/auth/AccountSettingsPage.vue'),
        meta: {
          title: 'metadata.accountSettings.title',
          description: 'metadata.accountSettings.description',
        },
      },
    ],
  },
  ...(authConfig.requiresAccountStatus
    ? [
        {
          path: '/account-deactivated',
          component: () => import('@/layouts/AuthLayout.vue'),
          meta: {
            requiresAuth: true,
            allowRestrictedAccount: true,
            title: 'metadata.accountDeactivated.title' as DocumentMetaKey,
            description: 'metadata.accountDeactivated.description' as DocumentMetaKey,
          },
          children: [
            {
              path: '',
              name: 'account-deactivated',
              component: () => import('@/pages/auth/AccountDeactivatedPage.vue'),
            },
          ],
        },
      ]
    : []),
  {
    path: '/session-error',
    name: 'session-error',
    component: () => import('@/pages/error/SessionErrorPage.vue'),
    meta: {
      title: 'metadata.sessionError.title',
      description: 'metadata.sessionError.description',
    },
  },
  {
    path: '/welcome',
    component: () => import('@/layouts/PublicLayout.vue'),
    meta: {
      title: 'metadata.welcome.title',
      description: 'metadata.welcome.description',
    },
    children: [
      {
        path: '',
        name: 'welcome',
        component: () => import('@/pages/WelcomePage.vue'),
      },
    ],
  },
  {
    path: '/auth',
    component: () => import('@/layouts/AuthLayout.vue'),
    redirect: {
      name: 'login',
    },
    meta: {
      guestOnly: true,
    },
    children: [
      {
        path: '/login',
        name: 'login',
        component: () => import('@/pages/auth/LoginPage.vue'),
        meta: {
          title: 'metadata.login.title',
          description: 'metadata.login.description',
        },
      },
      {
        path: '/register',
        name: 'register',
        component: () => import('@/pages/auth/RegisterPage.vue'),
        meta: {
          title: 'metadata.register.title',
          description: 'metadata.register.description',
        },
      },
      {
        path: '/forgot-password',
        name: 'forgot-password',
        component: () => import('@/pages/auth/ForgotPasswordPage.vue'),
        meta: {
          title: 'metadata.forgotPassword.title',
          description: 'metadata.forgotPassword.description',
        },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/pages/error/NotFoundPage.vue'),
    meta: {
      title: 'metadata.notFound.title',
      description: 'metadata.notFound.description',
    },
  },
]
