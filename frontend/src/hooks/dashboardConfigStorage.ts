/**
 * Storage adapter: localStorage + /dashboard-layouts/ API.
 * Owns every read/write of the persisted config shape; shape unchanged.
 */
import { dashboardLayoutApi } from '../api'
import {
  STORAGE_KEY,
  safeParseDashboardConfig,
} from './dashboardConfigSchema'
import type { DashboardConfig } from './dashboardConfigSchema'

export interface LoadedLayout {
  config: DashboardConfig
  layoutId: number | null
}

export function loadFromLocalStorage(): DashboardConfig | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    return safeParseDashboardConfig(stored)
  } catch (error) {
    console.error('Failed to load from localStorage:', error)
    return null
  }
}

export function saveToLocalStorage(config: DashboardConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch (error) {
    console.error('Failed to save to localStorage:', error)
  }
}

async function fetchDefaultLayout(): Promise<{ config: DashboardConfig; id: number } | null> {
  try {
    const response = await dashboardLayoutApi.getDefault()
    const layout = response.data
    const parsed = safeParseDashboardConfig(layout.config)
    if (parsed === null) {
      console.error('Default layout config failed validation, ignoring remote payload')
      return null
    }
    return { config: parsed, id: layout.id }
  } catch {
    return null
  }
}

export async function createRemoteLayout(config: DashboardConfig): Promise<number | null> {
  try {
    const response = await dashboardLayoutApi.create({
      name: 'default',
      config,
      is_default: true,
    })
    return response.data.id as number
  } catch (err) {
    console.error('Failed to save to backend:', err)
    return null
  }
}

export async function updateRemoteLayout(layoutId: number, config: DashboardConfig): Promise<boolean> {
  try {
    await dashboardLayoutApi.update(layoutId, { config })
    return true
  } catch (error) {
    console.error('Failed to save to backend:', error)
    return false
  }
}

/**
 * Monolith-compatible load sequence:
 * 1. backend default → use it (validated)
 * 2. else localStorage → use it (validated) + try to seed backend
 * 3. else null (caller keeps DEFAULT_CONFIG)
 */
export async function loadDashboardConfig(): Promise<LoadedLayout | null> {
  const remote = await fetchDefaultLayout()
  if (remote) return { config: remote.config, layoutId: remote.id }

  console.log('No default layout found, using localStorage or creating new')
  const local = loadFromLocalStorage()
  if (local) {
    const layoutId = await createRemoteLayout(local)
    return { config: local, layoutId }
  }
  return null
}
