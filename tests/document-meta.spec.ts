// @vitest-environment jsdom

import { createI18n } from 'vue-i18n'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { setupDocumentMeta } from '@/router/document-meta'

const messages = {
  en: {
    metadata: {
      default: { title: 'Vue Firebase Starter', description: 'Default description' },
      page: { title: 'Page · Vue Firebase Starter', description: 'Page description' },
    },
  },
  es: {
    metadata: {
      default: { title: 'Vue Firebase Starter', description: 'Descripción predeterminada' },
      page: { title: 'Página · Vue Firebase Starter', description: 'Descripción de página' },
    },
  },
}

describe('setupDocumentMeta', () => {
  let cleanup: (() => void) | undefined

  beforeEach(() => {
    document.title = ''
    document.head.innerHTML = '<meta name="description" content="Initial description" />'
  })

  afterEach(() => cleanup?.())

  it('applies defaults before the initial route is resolved', () => {
    const { router, i18n } = createTestApplication()
    cleanup = setupDocumentMeta(router, i18n)

    expect(document.title).toBe('Vue Firebase Starter')
    expect(getDescription()).toBe('Default description')
  })

  it('updates title and description from route metadata', async () => {
    const { router, i18n } = createTestApplication()
    cleanup = setupDocumentMeta(router, i18n)

    await router.push('/page')

    expect(document.title).toBe('Page · Vue Firebase Starter')
    expect(getDescription()).toBe('Page description')
  })

  it('uses defaults for missing route metadata', async () => {
    const { router, i18n } = createTestApplication()
    cleanup = setupDocumentMeta(router, i18n)

    await router.push('/without-meta')

    expect(document.title).toBe('Vue Firebase Starter')
    expect(getDescription()).toBe('Default description')
  })

  it('reuses the existing description tag and updates metadata after a locale change', async () => {
    const { router, i18n } = createTestApplication()
    const description = document.querySelector('meta[name="description"]')
    cleanup = setupDocumentMeta(router, i18n)

    await router.push('/page')
    i18n.global.locale.value = 'es'
    await Promise.resolve()

    expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(1)
    expect(document.querySelector('meta[name="description"]')).toBe(description)
    expect(document.title).toBe('Página · Vue Firebase Starter')
    expect(getDescription()).toBe('Descripción de página')
  })
})

function createTestApplication() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/page', component: { template: '<div />' }, meta: { title: 'metadata.page.title', description: 'metadata.page.description' } },
      { path: '/without-meta', component: { template: '<div />' } },
    ],
  })
  const i18n = createI18n({ legacy: false, locale: 'en', messages })

  return { router, i18n }
}

function getDescription(): string | null {
  return document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ?? null
}
