import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/AppLayout.vue'),
    meta: {
      requiresAuth: true,
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
      },
    ],
  },
  {
    path: '/account-deactivated',
    component: () => import('@/layouts/AuthLayout.vue'),
    meta: {
      requiresAuth: true,
      allowDeactivated: true,
    },
    children: [
      {
        path: '',
        name: 'account-deactivated',
        component: () => import('@/pages/auth/AccountDeactivatedPage.vue'),
      },
    ],
  },
  {
    path: '/welcome',
    component: () => import('@/layouts/PublicLayout.vue'),
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
      },
      {
        path: '/register',
        name: 'register',
        component: () => import('@/pages/auth/RegisterPage.vue'),
      },
      {
        path: '/forgot-password',
        name: 'forgot-password',
        component: () => import('@/pages/auth/ForgotPasswordPage.vue'),
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/pages/error/NotFoundPage.vue'),
  },
]
