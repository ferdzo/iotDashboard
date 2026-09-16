import { memo } from 'react'
import type { WidgetConfig } from '../../hooks'
import { widgetRegistry } from './registry'
import WidgetCard from '../ui/WidgetCard'
import { WidgetError } from '../ui'

interface WidgetContainerProps {
  config: WidgetConfig
  editing?: boolean
  onRemove?: (id: string) => void
  onEdit?: (id: string) => void
}

/** Widget types backed by a live polling query (others render on demand). */
const LIVE_TYPES = new Set([
  'line-chart',
  'stat',
  'gauge',
  'weather',
  'air-quality',
  'comfort-index',
  'run-suitability',
  'health-stats',
])

function WidgetContainer({ config, editing = false, onRemove, onEdit }: WidgetContainerProps) {
  const WidgetComponent = widgetRegistry[config.type]
  const subtitle =
    config.deviceIds?.[0]
      ? `${config.deviceIds[0]}${config.metricIds?.[0] ? ` · ${config.metricIds[0]}` : ''}`
      : undefined

  if (!WidgetComponent) {
    return (
      <WidgetCard title={config.title || config.type}>
        <WidgetError message={`Unknown widget type: ${config.type}`} />
      </WidgetCard>
    )
  }

  return (
    <div className="relative h-full w-full">
      <WidgetCard
        title={config.title || config.type}
        subtitle={subtitle}
        live={LIVE_TYPES.has(config.type)}
        editing={editing}
        onEdit={onEdit ? () => onEdit(config.id) : undefined}
        onRemove={onRemove ? () => onRemove(config.id) : undefined}
      >
        <WidgetComponent config={config} />
      </WidgetCard>
    </div>
  )
}

export default memo(WidgetContainer)
