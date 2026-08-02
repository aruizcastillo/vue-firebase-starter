/** @vitest-environment jsdom */

import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { defineComponent, nextTick, onUnmounted } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/services/auth.service', () => ({
  checkPasswordAgainstPolicy: vi.fn(),
  loginWithEmail: vi.fn(),
  loginWithGoogle: vi.fn(),
  logout: vi.fn(),
  observeAuthState: vi.fn(),
  registerWithEmail: vi.fn(),
  resetPassword: vi.fn(),
}))

vi.mock('@/services/profile.service', () => ({
  observeUserProfile: vi.fn(),
  reconcileUserProfile: vi.fn(),
  setUserAccountStatus: vi.fn(),
  updateUserProfile: vi.fn(),
}))

describe('application session feedback', () => {
  it('keeps the active route mounted under loading and error feedback', async () => {
    installLocalStorage()

    const [{ default: App }, { i18n }, { useSessionStore }] = await Promise.all([import('@/App.vue'), import('@/i18n'), import('@/stores/session.store')])
    const unmounted = vi.fn()
    const RoutePage = defineComponent({
      setup() {
        onUnmounted(unmounted)
      },
      template: '<p data-test="route-page">Login page</p>',
    })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/login', component: RoutePage }],
    })
    const pinia = createPinia()
    const sessionStore = useSessionStore(pinia)
    sessionStore.phase = 'ready'

    await router.push('/login')
    await router.isReady()

    const wrapper = mount(App, {
      global: { plugins: [pinia, i18n, router] },
    })

    expect(wrapper.get('[data-test="route-page"]').exists()).toBe(true)

    sessionStore.phase = 'loading-profile'
    await nextTick()

    expect(wrapper.get('[data-test="route-page"]').exists()).toBe(true)
    expect(wrapper.get('[role="status"]').exists()).toBe(true)
    expect(unmounted).not.toHaveBeenCalled()

    sessionStore.error = 'Profile unavailable'
    sessionStore.phase = 'error'
    await nextTick()

    expect(wrapper.get('[data-test="route-page"]').exists()).toBe(true)
    expect(wrapper.get('[role="alert"]').text()).toContain('Profile unavailable')
    expect(unmounted).not.toHaveBeenCalled()
  })

  it('retries and returns to the protected destination', async () => {
    installLocalStorage()
    const [{ default: App }, { i18n }, { useSessionStore }] = await Promise.all([import('@/App.vue'), import('@/i18n'), import('@/stores/session.store')])
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/session-error', name: 'session-error', component: { template: '<p>Error route</p>' } },
        { path: '/account/settings', component: { template: '<p>Settings</p>' } },
      ],
    })
    const pinia = createPinia()
    const sessionStore = useSessionStore(pinia)
    sessionStore.phase = 'error'
    sessionStore.error = 'Profile unavailable'
    vi.spyOn(sessionStore, 'retry').mockResolvedValue(true)

    await router.push('/session-error?redirect=/account/settings')
    await router.isReady()

    const wrapper = mount(App, {
      global: { plugins: [pinia, i18n, router] },
    })

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(sessionStore.retry).toHaveBeenCalledOnce()
    expect(router.currentRoute.value.path).toBe('/account/settings')
  })

  it('can sign out from a session error', async () => {
    installLocalStorage()
    const [{ default: App }, { i18n }, { useAuthStore }, { useSessionStore }] = await Promise.all([import('@/App.vue'), import('@/i18n'), import('@/stores/auth.store'), import('@/stores/session.store')])
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/session-error', component: { template: '<p>Error route</p>' } },
        { path: '/welcome', name: 'welcome', component: { template: '<p>Welcome</p>' } },
      ],
    })
    const pinia = createPinia()
    const authStore = useAuthStore(pinia)
    const sessionStore = useSessionStore(pinia)
    sessionStore.phase = 'error'
    vi.spyOn(authStore, 'signOut').mockResolvedValue(true)
    vi.spyOn(sessionStore, 'ensureReady').mockResolvedValue(true)

    await router.push('/session-error')
    await router.isReady()

    const wrapper = mount(App, {
      global: { plugins: [pinia, i18n, router] },
    })

    await wrapper.findAll('button')[1]!.trigger('click')
    await flushPromises()

    expect(authStore.signOut).toHaveBeenCalledOnce()
    expect(router.currentRoute.value.name).toBe('welcome')
  })
})

function installLocalStorage(): void {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
    },
  })
}
