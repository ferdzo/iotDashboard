import { useTelemetrySeries } from '../../hooks'
import type { WidgetConfig } from '../../hooks'

interface GaugeWidgetProps {
  config: WidgetConfig
}

export default function GaugeWidget({ config }: GaugeWidgetProps) {
  const { deviceIds, metricIds, timeframe, title } = config

  const deviceId = deviceIds[0]
  const metric = metricIds[0]

  const { data, isLoading, error } = useTelemetrySeries({
    deviceId,
    metric,
    hours: timeframe.hours,
    startTime: timeframe.startTime,
    endTime: timeframe.endTime,
    limit: 1,
  })

  const latest = data[0]
  const value = latest?.value || 0

  // Simple gauge ranges (could be configured per metric)
  const ranges = {
    low: 33,
    medium: 66,
    high: 100,
  }

  const percentage = Math.min(100, Math.max(0, value))
  let color = 'text-success'
  if (percentage > ranges.medium) color = 'text-error'
  else if (percentage > ranges.low) color = 'text-warning'

  if (isLoading) {
    return (
      <div className="card bg-base-200 animate-pulse">
        <div className="card-body h-48"></div>
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
      <div className="card-body items-center text-center">
        <h3 className="card-title text-base">{title || metric}</h3>
        <div className="relative w-32 h-32 mt-4">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-base-300"
            />
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 56}`}
              strokeDashoffset={`${2 * Math.PI * 56 * (1 - percentage / 100)}`}
              className={color}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div>
              <div className={`text-3xl font-bold ${color}`}>
                {value.toFixed(1)}
              </div>
              {latest?.unit && (
                <div className="text-sm text-base-content/60">{latest.unit}</div>
              )}
            </div>
          </div>
        </div>
        {latest && (
          <div className="text-xs text-base-content/50 mt-4">
            Updated {new Date(latest.time).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  )
}
