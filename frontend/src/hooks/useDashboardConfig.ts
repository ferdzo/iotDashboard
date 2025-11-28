import { useState, useEffect, useRef } from 'react'
import { dashboardLayoutApi } from '../api'

export type WidgetType = 'line-chart' | 'gauge' | 'stat' | 'ai-insight' | 'bar-chart' | 'air-quality' | 'weather' | 'comfort-index' | 'run-suitability' | 'health-stats' | 'calendar' | 'daily-briefing'

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
  calendar?: {
    icalUrl: string
    timeRangeHours?: number
  }
  briefing?: {
    briefingType: 'schedule' | 'environment' | 'full'
    city: string
    healthDeviceId?: string
    calendarUrl?: string
    calendarRangeHours?: number
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
 * Hook to manage dashboard configuration with backend sync and localStorage fallback
 * Single-user system: No authentication required
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
        // Try to load from backend
        try {
          const response = await dashboardLayoutApi.getDefault()
          const layout = response.data
          setConfig(layout.config)
          setLayoutId(layout.id)
        } catch (error: any) {
          // No default layout found, try to create one or use localStorage fallback
          console.log('No default layout found, using localStorage or creating new')
          const stored = localStorage.getItem(STORAGE_KEY)
          if (stored) {
            const parsed = JSON.parse(stored) as DashboardConfig
            setConfig(parsed)
            // Save to backend
            try {
              const response = await dashboardLayoutApi.create({
                name: 'default',
                config: parsed,
                is_default: true,
              })
              setLayoutId(response.data.id)
            } catch (err) {
              console.error('Failed to save to backend:', err)
            }
          }
        }
      } catch (error) {
        console.error('Failed to load dashboard config:', error)
        // Fallback to localStorage
        try {
          const stored = localStorage.getItem(STORAGE_KEY)
          if (stored) {
            setConfig(JSON.parse(stored) as DashboardConfig)
          }
        } catch (e) {
          console.error('Failed to load from localStorage:', e)
        }
      } finally {
        setIsLoading(false)
        isInitialLoadRef.current = false
      }
    }

    loadConfig()
  }, [])

  const saveConfig = async () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    } catch (error) {
      console.error('Failed to save to localStorage:', error)
    }

    // Save to backend
    try {
      if (layoutId) {
        // Update existing layout
        await dashboardLayoutApi.update(layoutId, {
          config: config,
        })
      } else {
        // Create new layout
        const response = await dashboardLayoutApi.create({
          name: 'default',
          config: config,
          is_default: true,
        })
        setLayoutId(response.data.id)
      }
      return true
    } catch (error) {
      console.error('Failed to save to backend:', error)
      return false
    }
  }

  // Only save to localStorage automatically (no backend saves)
  useEffect(() => {
    if (!isInitialLoadRef.current) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
      } catch (error) {
        console.error('Failed to save to localStorage:', error)
      }
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
    saveConfig,
    isLoading,
  }
}
