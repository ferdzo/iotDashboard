/**
 * Dashboard config schema + shared types (dependency-free validation).
 *
 * zod is NOT a dependency of frontend/package.json, so this module provides
 * a small structural validator with the same role a Zod schema would play:
 * every persisted/remote/imported payload is checked before it reaches state.
 * Persisted shape is unchanged — validation accepts exactly what the monolith
 * accepted (plus rejects malformed payloads the monolith would have crashed on).
 */

export type WidgetType =
  | 'line-chart'
  | 'gauge'
  | 'stat'
  | 'ai-insight'
  | 'air-quality'
  | 'weather'
  | 'comfort-index'
  | 'run-suitability'
  | 'health-stats'
  | 'calendar'
  | 'daily-briefing'

export const WIDGET_TYPES: readonly WidgetType[] = [
  'line-chart',
  'gauge',
  'stat',
  'ai-insight',
  'air-quality',
  'weather',
  'comfort-index',
  'run-suitability',
  'health-stats',
  'calendar',
  'daily-briefing',
]

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
  /** Column count the stored positions were authored against (grid migration guard). */
  gridCols?: number
}

/** Current grid column count. Stored positions are authored against this. */
export const GRID_COLS = 12

/** Legacy grid column count, before the responsive 12-col grid. */
export const LEGACY_GRID_COLS = 5

/** Legacy row height (px); widget heights were authored against this. */
const LEGACY_ROW_PX = 90
/** Current row height (px) — must match ROW_HEIGHT in pages/Dashboard.tsx. */
const CURRENT_ROW_PX = 56

export const DEFAULT_CONFIG: DashboardConfig = {
  widgets: [],
  layout: 'grid',
  refreshInterval: 30000,
  gridCols: GRID_COLS,
}

export const STORAGE_KEY = 'iot-dashboard-config'

export const AUTOSAVE_DEBOUNCE_MS = 2000

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string')

export function isWidgetType(v: unknown): v is WidgetType {
  return typeof v === 'string' && (WIDGET_TYPES as readonly string[]).includes(v)
}

export function isWidgetConfig(v: unknown): v is WidgetConfig {
  if (!isRecord(v)) return false
  if (typeof v.id !== 'string' || v.id.length === 0) return false
  if (!isWidgetType(v.type)) return false
  if (typeof v.title !== 'string') return false
  if (!isStringArray(v.deviceIds)) return false
  if (!isStringArray(v.metricIds)) return false
  if (!isRecord(v.timeframe)) return false
  if (v.layout !== undefined && v.layout !== 'grid' && v.layout !== 'freeform') return false
  return true
}

export function isDashboardConfig(v: unknown): v is DashboardConfig {
  if (!isRecord(v)) return false
  if (!Array.isArray(v.widgets)) return false
  if (!v.widgets.every(isWidgetConfig)) return false
  if (v.layout !== 'grid' && v.layout !== 'freeform') return false
  if (v.refreshInterval !== undefined && typeof v.refreshInterval !== 'number') return false
  if (v.gridCols !== undefined && typeof v.gridCols !== 'number') return false
  return true
}

/**
 * Scale stored widget positions from the legacy 5-column / 90px-row grid onto
 * the current 12-column / 56px-row grid. Idempotent: configs already on
 * GRID_COLS pass through untouched. Positions are optional, so widgets without
 * one are left for the grid's auto-placement.
 */
export function migrateGridColumns(config: DashboardConfig): DashboardConfig {
  const from = config.gridCols ?? LEGACY_GRID_COLS
  if (from === GRID_COLS) return config
  const colRatio = GRID_COLS / from
  const rowRatio = LEGACY_ROW_PX / CURRENT_ROW_PX
  return {
    ...config,
    gridCols: GRID_COLS,
    widgets: config.widgets.map((w) => {
      if (!w.position) return w
      // A widget that spanned the legacy grid stays genuinely full-width
      // (legacy "Full Width" was 4 of 5, which would otherwise map to 10 of 12).
      const wasFullWidth = w.position.w >= from - 1
      const w2 = wasFullWidth
        ? GRID_COLS
        : Math.min(GRID_COLS, Math.max(2, Math.round(w.position.w * colRatio)))
      const x2 = Math.min(GRID_COLS - w2, Math.max(0, Math.round(w.position.x * colRatio)))
      const h2 = Math.min(12, Math.max(2, Math.round(w.position.h * rowRatio)))
      return { ...w, position: { ...w.position, x: x2, w: w2, h: h2 } }
    }),
  }
}

/**
 * Parse an unknown value into a DashboardConfig.
 * Returns the value unchanged when valid, null when invalid.
 * Never throws; never mutates; never reshapes the persisted config.
 */
export function safeParseDashboardConfig(raw: unknown): DashboardConfig | null {
  let value = raw
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return null
    }
  }
  return isDashboardConfig(value) ? value : null
}

/**
 * Parse or throw with the monolith's error message ('Invalid configuration').
 */
export function parseDashboardConfigOrThrow(configOrJson: DashboardConfig | string): DashboardConfig {
  const parsed = safeParseDashboardConfig(configOrJson)
  if (!parsed) throw new Error('Invalid configuration')
  return parsed
}
