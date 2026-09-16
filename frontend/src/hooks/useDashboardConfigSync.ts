/**
 * Sync engine: immediate localStorage write + debounced (2s) backend autosave.
 * Extracted verbatim from the monolith's autosave effect; behavior identical.
 */
import { useEffect, type MutableRefObject } from 'react'
import type { DashboardConfig } from './dashboardConfigSchema'
import { AUTOSAVE_DEBOUNCE_MS } from './dashboardConfigSchema'
import {
  saveToLocalStorage,
  createRemoteLayout,
  updateRemoteLayout,
} from './dashboardConfigStorage'

interface SyncEngineArgs {
  config: DashboardConfig
  layoutId: number | null
  setLayoutId: (id: number | null) => void
  /** Monolith's initial-load guard: autosave is skipped until load completes. */
  isInitialLoadRef: MutableRefObject<boolean>
  debounceMs?: number
}

export function useDashboardConfigSync({
  config,
  layoutId,
  setLayoutId,
  isInitialLoadRef,
  debounceMs = AUTOSAVE_DEBOUNCE_MS,
}: SyncEngineArgs): void {
  useEffect(() => {
    if (isInitialLoadRef.current) return

    // Save to localStorage immediately
    saveToLocalStorage(config)

    // Auto-save to backend with debounce (2 seconds after last change)
    const timeoutId = setTimeout(async () => {
      try {
        if (layoutId) {
          await updateRemoteLayout(layoutId, config)
          console.log('Dashboard auto-saved to backend')
        } else {
          const id = await createRemoteLayout(config)
          if (id !== null) {
            setLayoutId(id)
            console.log('Dashboard created and auto-saved to backend')
          }
        }
      } catch (error) {
        console.error('Failed to auto-save to backend:', error)
      }
    }, debounceMs)

    return () => clearTimeout(timeoutId)
  }, [config, layoutId, setLayoutId, isInitialLoadRef, debounceMs])
}
