import { useCallback, useState } from 'react'

/**
 * Single source of truth for the dashboard color theme (task 15).
 *
 * - Supported themes: light, dark (+ trim cupcake, corporate) via daisyUI.
 * - Applied as `data-theme` on <html> (document.documentElement).
 * - Persisted in localStorage so it survives reload.
 * - Invalid stored/applied values fall back to DEFAULT_THEME (never blank).
 */

export const THEME_STORAGE_KEY = 'iot-dashboard-theme'

export const THEMES = ['light', 'dark', 'cupcake', 'corporate'] as const

export type ThemeName = (typeof THEMES)[number]

export const DEFAULT_THEME: ThemeName = 'light'

export function isThemeName(value: unknown): value is ThemeName {
  return (
    typeof value === 'string' &&
    (THEMES as readonly string[]).includes(value)
  )
}

export function getStoredTheme(): ThemeName {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (isThemeName(raw)) return raw
  } catch {
    // storage unavailable (private mode, SSR) -> fall through to default
  }
  return DEFAULT_THEME
}

export function applyTheme(theme: ThemeName): ThemeName {
  const name: ThemeName = isThemeName(theme) ? theme : DEFAULT_THEME
  try {
    localStorage.setItem(THEME_STORAGE_KEY, name)
  } catch {
    // storage unavailable -> theme still applies to the live document
  }
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', name)
  }
  return name
}

/** Apply the persisted theme (call once at startup, pre-paint script in index.html runs first). */
export function applyStoredTheme(): ThemeName {
  return applyTheme(getStoredTheme())
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeName>(getStoredTheme)
  const setTheme = useCallback((next: ThemeName) => {
    setThemeState(applyTheme(next))
  }, [])
  return { theme, setTheme, themes: THEMES }
}
