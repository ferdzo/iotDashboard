import { useState, useEffect } from 'react'

export type WidgetType = 'line-chart' | 'gauge' | 'stat' | 'ai-insight' | 'bar-chart' | 'air-quality' | 'weather'

export interface WidgetConfig {
  id: string
  type: WidgetType
  title: string
  deviceIds: string[]
  metricIds: string[]
  timeframe: {
    hours?: number
    startTime?: string
    endTime?: string
  }
  visualization?: {
    colors?: string[]
    showLegend?: boolean
    showGrid?: boolean
    height?: number
    city?: string 
  }
  position?: {
    x: number
    y: number
    w: number
    h: number
  }
}

export interface DashboardConfig {
  widgets: WidgetConfig[]
  layout: 'grid' | 'freeform'
  refreshInterval?: number
}

const DEFAULT_CONFIG: DashboardConfig = {
  widgets: [],
  layout: 'grid',
  refreshInterval: 30000,
}

const STORAGE_KEY = 'iot-dashboard-config'

/**
 * Hook to manage dashboard configuration with localStorage persistence
 */
export function useDashboardConfig() {
  const [config, setConfig] = useState<DashboardConfig>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored) as DashboardConfig
      }
    } catch (error) {
      console.error('Failed to load dashboard config:', error)
    }
    return DEFAULT_CONFIG
  })

  // Persist to localStorage whenever config changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    } catch (error) {
      console.error('Failed to save dashboard config:', error)
    }
  }, [config])

  const addWidget = (widget: WidgetConfig) => {
    setConfig((prev) => ({
      ...prev,
      widgets: [...prev.widgets, widget],
    }))
  }

  const updateWidget = (id: string, updates: Partial<WidgetConfig>) => {
    setConfig((prev) => ({
      ...prev,
      widgets: prev.widgets.map((w) => (w.id === id ? { ...w, ...updates } : w)),
    }))
  }

  const removeWidget = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      widgets: prev.widgets.filter((w) => w.id !== id),
    }))
  }

  const reorderWidgets = (widgets: WidgetConfig[]) => {
    setConfig((prev) => ({
      ...prev,
      widgets,
    }))
  }

  const resetConfig = () => {
    setConfig(DEFAULT_CONFIG)
  }

  const exportConfig = (): string => {
    return JSON.stringify(config, null, 2)
  }

  const importConfig = (configOrJson: DashboardConfig | string) => {
    try {
      const imported = typeof configOrJson === 'string' 
        ? JSON.parse(configOrJson) as DashboardConfig
        : configOrJson
      setConfig(imported)
    } catch (error) {
      console.error('Failed to import config:', error)
      throw new Error('Invalid configuration')
    }
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
  }
}
