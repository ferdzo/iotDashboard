/**
 * Pure CRUD + import/export operations over DashboardConfig.
 * Stateless functions so they are unit-testable without React.
 */
import {
  DEFAULT_CONFIG,
  parseDashboardConfigOrThrow,
} from './dashboardConfigSchema'
import type { DashboardConfig, WidgetConfig } from './dashboardConfigSchema'

export function addWidgetOp(config: DashboardConfig, widget: WidgetConfig): DashboardConfig {
  return { ...config, widgets: [...config.widgets, widget] }
}

export function updateWidgetOp(
  config: DashboardConfig,
  id: string,
  updates: Partial<WidgetConfig>,
): DashboardConfig {
  return {
    ...config,
    widgets: config.widgets.map((w) => (w.id === id ? { ...w, ...updates } : w)),
  }
}

export function removeWidgetOp(config: DashboardConfig, id: string): DashboardConfig {
  return { ...config, widgets: config.widgets.filter((w) => w.id !== id) }
}

export function reorderWidgetsOp(config: DashboardConfig, widgets: WidgetConfig[]): DashboardConfig {
  return { ...config, widgets }
}

export function resetConfigOp(): DashboardConfig {
  return DEFAULT_CONFIG
}

export function exportConfigOp(config: DashboardConfig): string {
  return JSON.stringify(config, null, 2)
}

/** Validates via schema; throws Error('Invalid configuration') like the monolith. */
export function importConfigOp(configOrJson: DashboardConfig | string): DashboardConfig {
  return parseDashboardConfigOrThrow(configOrJson)
}
