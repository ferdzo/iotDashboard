/**
 * Aggregator over the 11 co-located per-widget schemas (`widgets/<name>/schema.ts`).
 * The generic renderer iterates this list; widget runtime components are untouched.
 */
import type { WidgetType } from '../../hooks/dashboardConfigSchema'
import type { WidgetTypeSchema } from './configSchema'

import stat from './stat/schema'
import lineChart from './line-chart/schema'
import gauge from './gauge/schema'
import aiInsight from './ai-insight/schema'
import airQuality from './air-quality/schema'
import weather from './weather/schema'
import comfortIndex from './comfort-index/schema'
import runSuitability from './run-suitability/schema'
import healthStats from './health-stats/schema'
import calendar from './calendar/schema'
import dailyBriefing from './daily-briefing/schema'

export const widgetSchemas: Record<WidgetType, WidgetTypeSchema> = {
  stat,
  'line-chart': lineChart,
  gauge,
  'ai-insight': aiInsight,
  'air-quality': airQuality,
  weather,
  'comfort-index': comfortIndex,
  'run-suitability': runSuitability,
  'health-stats': healthStats,
  calendar,
  'daily-briefing': dailyBriefing,
}

/** Picker order matches the legacy AddWidgetModal step-1 button order. */
export const widgetSchemaList: WidgetTypeSchema[] = [
  stat,
  lineChart,
  gauge,
  aiInsight,
  weather,
  airQuality,
  comfortIndex,
  runSuitability,
  healthStats,
  calendar,
  dailyBriefing,
]

export function getWidgetSchema(type: WidgetType): WidgetTypeSchema {
  return widgetSchemas[type]
}
