import { useState, useEffect, useRef } from 'react'
import {
  DEFAULT_CONFIG,
} from './dashboardConfigSchema'
import type {
  DashboardConfig,
  WidgetConfig,
  WidgetType,
} from './dashboardConfigSchema'
import {
  loadDashboardConfig,
  loadFromLocalStorage,
  saveToLocalStorage,
  createRemoteLayout,
  updateRemoteLayout,
} from './dashboardConfigStorage'
import { useDashboardConfigSync } from './useDashboardConfigSync'
import {
  addWidgetOp,
  updateWidgetOp,
  removeWidgetOp,
  reorderWidgetsOp,
  resetConfigOp,
  exportConfigOp,
  importConfigOp,
} from './dashboardConfigOps'

// Keep WidgetType/WidgetConfig/DashboardConfig names stable for consumers.
export type { WidgetType, WidgetConfig, DashboardConfig }
export { DEFAULT_CONFIG }

/**
 * Hook to manage dashboard configuration with backend sync and localStorage fallback
 * Single-user system: No authentication required
 *
 * Thin orchestrator: storage adapter (dashboardConfigStorage) + sync engine
 * (useDashboardConfigSync) + CRUD ops (dashboardConfigOps) + schema
 * (dashboardConfigSchema). Persisted config shape unchanged.
 */
export function useDashboardConfig() {
  const [config, setConfig] = useState<DashboardConfig>(DEFAULT_CONFIG)
  const [isLoading, setIsLoading] = useState(true)
  const [layoutId, setLayoutId] = useState<number | null>(null)
  const isInitialLoadRef = useRef(true)

  // Load config from backend or localStorage
  useEffect(() => {
    const loadConfig = async () => {
      setIsLoading(true)
      try {
        const loaded = await loadDashboardConfig()
        if (loaded) {
          setConfig(loaded.config)
          setLayoutId(loaded.layoutId)
        }
      } catch (error) {
        console.error('Failed to load dashboard config:', error)
        // Fallback to localStorage
        const local = loadFromLocalStorage()
        if (local) setConfig(local)
      } finally {
        setIsLoading(false)
        isInitialLoadRef.current = false
      }
    }

    loadConfig()
  }, [])

  const saveConfig = async () => {
    saveToLocalStorage(config)

    // Save to backend
    if (layoutId) {
      return updateRemoteLayout(layoutId, config)
    }
    const id = await createRemoteLayout(config)
    if (id !== null) {
      setLayoutId(id)
      return true
    }
    return false
  }

  // Auto-save to localStorage and debounced backend save
  useDashboardConfigSync({ config, layoutId, setLayoutId, isInitialLoadRef })

  const addWidget = (widget: WidgetConfig) => {
    setConfig((prev) => addWidgetOp(prev, widget))
  }

  const updateWidget = (id: string, updates: Partial<WidgetConfig>) => {
    setConfig((prev) => updateWidgetOp(prev, id, updates))
  }

  const removeWidget = (id: string) => {
    setConfig((prev) => removeWidgetOp(prev, id))
  }

  const reorderWidgets = (widgets: WidgetConfig[]) => {
    setConfig((prev) => reorderWidgetsOp(prev, widgets))
  }

  const resetConfig = () => {
    setConfig(resetConfigOp())
  }

  const exportConfig = (): string => {
    return exportConfigOp(config)
  }

  const importConfig = (configOrJson: DashboardConfig | string) => {
    setConfig(importConfigOp(configOrJson))
  }

  return {
    config,
    addWidget,
    updateWidget,
    removeWidget,
    reorderWidgets,
    resetConfig,
    exportConfig,
    importConfig,
    saveConfig,
    isLoading,
  }
}
