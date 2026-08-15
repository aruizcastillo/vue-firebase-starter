import { watch } from 'vue'
import type { Ref } from 'vue'
import type { RouteLocationNormalizedLoaded, Router } from 'vue-router'

import type { DocumentMetaKey } from './meta'

const defaultTitleKey: DocumentMetaKey = 'metadata.default.title'
const defaultDescriptionKey: DocumentMetaKey = 'metadata.default.description'

type DocumentMetaI18n = {
  global: {
    locale: Ref<string>
    t: (key: DocumentMetaKey) => string
  }
}

function getMessage(i18n: DocumentMetaI18n, key: DocumentMetaKey): string {
  return String(i18n.global.t(key))
}

function applyDocumentMeta(route: RouteLocationNormalizedLoaded, i18n: DocumentMetaI18n): void {
  const titleKey = route.meta.title ?? defaultTitleKey
  const descriptionKey = route.meta.description ?? defaultDescriptionKey

  document.title = getMessage(i18n, titleKey)

  const description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
  if (description) description.content = getMessage(i18n, descriptionKey)
}

export function setupDocumentMeta(router: Router, i18n: DocumentMetaI18n): () => void {
  applyDocumentMeta(router.currentRoute.value, i18n)

  const removeAfterEach = router.afterEach((to) => applyDocumentMeta(to, i18n))
  const stopWatchingLocale = watch(i18n.global.locale, () => applyDocumentMeta(router.currentRoute.value, i18n))

  return () => {
    removeAfterEach()
    stopWatchingLocale()
  }
}
