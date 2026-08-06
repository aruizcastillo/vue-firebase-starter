import { createI18n } from 'vue-i18n'

import en from '@/locales/en.json'
import es from '@/locales/es.json'

export const supportedLocales = ['en', 'es'] as const
export type SupportedLocale = (typeof supportedLocales)[number]

const DEFAULT_LOCALE: SupportedLocale = 'en'
const LOCALE_STORAGE_KEY = 'locale'

function setDocumentLanguage(locale: SupportedLocale): void {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale
  }
}

function getInitialLocale(): SupportedLocale {
  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE
  }

  const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY)

  if (storedLocale && supportedLocales.includes(storedLocale as SupportedLocale)) {
    return storedLocale as SupportedLocale
  }

  const browserLocale = navigator.language.split('-')[0]

  return supportedLocales.includes(browserLocale as SupportedLocale) ? (browserLocale as SupportedLocale) : DEFAULT_LOCALE
}

const initialLocale = getInitialLocale()

setDocumentLanguage(initialLocale)

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: DEFAULT_LOCALE,
  messages: {
    en,
    es,
  },
})

export function setLocale(locale: SupportedLocale): void {
  i18n.global.locale.value = locale
  setDocumentLanguage(locale)

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  }
}
