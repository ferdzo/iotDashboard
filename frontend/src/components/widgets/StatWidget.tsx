import { useTelemetrySeries } from '../../hooks'
import type { WidgetConfig } from '../../hooks'
import { formatMetricName } from '../../utils/formatters'

interface StatWidgetProps {
  config: WidgetConfig
}

export default function StatWidgetProps({ config }: StatWidgetProps) {
  const { deviceIds, metricIds, timeframe, title } = config

  const deviceId = deviceIds[0]
  const metric = metricIds[0]

  const { data, isLoading, error } = useTelemetrySeries({
    deviceId,
    metric,
    hours: timeframe.hours,
    startTime: timeframe.startTime,
    endTime: timeframe.endTime,
    limit: 100,
  })

  const latest = data[0]
  const values = data.map((d) => d.value)
  const average = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
  const min = values.length > 0 ? Math.min(...values) : 0
  const max = values.length > 0 ? Math.max(...values) : 0

  if (isLoading) {
    return (
      <div className="card bg-base-200 animate-pulse">
        <div className="card-body h-32"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card bg-error/10">
        <div className="card-body">
          <p className="text-error text-sm">Error: {error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body">
        <div className="text-sm uppercase tracking-wide text-base-content/60">
          {title || formatMetricName(metric)}
        </div>
        <div className="text-4xl font-bold text-primary">
          {latest ? latest.value.toFixed(1) : '—'}
          {latest?.unit && <span className="text-xl ml-2">{latest.unit}</span>}
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4 text-sm">
          <div>
            <div className="text-base-content/60">Min</div>
            <div className="font-semibold">{min.toFixed(1)}</div>
          </div>
          <div>
            <div className="text-base-content/60">Avg</div>
            <div className="font-semibold">{average.toFixed(1)}</div>
          </div>
          <div>
            <div className="text-base-content/60">Max</div>
            <div className="font-semibold">{max.toFixed(1)}</div>
          </div>
        </div>
        <div className="text-xs text-base-content/50 mt-2">
          {data.length} readings in last {timeframe.hours || 24}h
        </div>
      </div>
    </div>
  )
}
