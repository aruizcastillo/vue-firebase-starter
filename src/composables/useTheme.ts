import { computed, ref, watch, type Ref } from 'vue'

export const themes = ['system', 'light', 'dark'] as const

export type Theme = (typeof themes)[number]
export type ResolvedTheme = Exclude<Theme, 'system'>

const THEME_STORAGE_KEY = 'theme'
const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)'

function isTheme(value: string | null): value is Theme {
  return value !== null && themes.includes(value as Theme)
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'system'
  }

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)

    return isTheme(storedTheme) ? storedTheme : 'system'
  } catch {
    return 'system'
  }
}

function getSystemThemeQuery(): MediaQueryList | undefined {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(SYSTEM_THEME_QUERY) : undefined
}

const systemTheme = ref<ResolvedTheme>(getSystemThemeQuery()?.matches ? 'dark' : 'light')

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'light' || theme === 'dark') {
    return theme
  }

  return systemTheme.value
}

const theme = ref<Theme>(getInitialTheme())
const resolvedTheme = computed<ResolvedTheme>(() => {
  if (typeof window === 'undefined') {
    return 'light'
  }

  return resolveTheme(theme.value)
})

function applyTheme(value: ResolvedTheme): void {
  document.documentElement.dataset.theme = value
  document.documentElement.style.colorScheme = value
}

watch(resolvedTheme, applyTheme, { immediate: typeof document !== 'undefined' })

if (typeof window !== 'undefined') {
  const mediaQuery = getSystemThemeQuery()

  mediaQuery?.addEventListener('change', (event) => {
    systemTheme.value = event.matches ? 'dark' : 'light'
  })

  watch(theme, (value) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, value)
    } catch {
      // The preference still works for the current session when storage is unavailable.
    }
  })
}

export function useTheme(): { theme: Ref<Theme>; resolvedTheme: Readonly<Ref<ResolvedTheme>> } {
  return { theme, resolvedTheme }
}
