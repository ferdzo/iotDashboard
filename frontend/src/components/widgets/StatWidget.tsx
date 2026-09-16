import { useTelemetrySeries } from '../../hooks'
import type { WidgetConfig } from '../../hooks'
import { WidgetSkeleton, WidgetError, WidgetEmpty } from '../ui'

interface StatWidgetProps {
  config: WidgetConfig
}

export default function StatWidget({ config }: StatWidgetProps) {
  const { deviceIds, metricIds, timeframe } = config

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

  if (isLoading) return <WidgetSkeleton lines={2} />
  if (error) return <WidgetError message={error.message} />
  if (data.length === 0) return <WidgetEmpty message="No readings yet" />

  return (
    <div className="flex flex-col gap-1">
      <div className="text-4xl font-bold tracking-tight text-primary tnum">
        {latest ? latest.value.toFixed(1) : '—'}
        {latest?.unit && <span className="text-lg font-medium ml-1.5 text-base-content/60">{latest.unit}</span>}
      </div>
      <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
        <div className="rounded-lg bg-base-200/70 px-2 py-1.5">
          <div className="text-[11px] uppercase tracking-wide text-base-content/50">Min</div>
          <div className="font-semibold tnum">{min.toFixed(1)}</div>
        </div>
        <div className="rounded-lg bg-base-200/70 px-2 py-1.5">
          <div className="text-[11px] uppercase tracking-wide text-base-content/50">Avg</div>
          <div className="font-semibold tnum">{average.toFixed(1)}</div>
        </div>
        <div className="rounded-lg bg-base-200/70 px-2 py-1.5">
          <div className="text-[11px] uppercase tracking-wide text-base-content/50">Max</div>
          <div className="font-semibold tnum">{max.toFixed(1)}</div>
        </div>
      </div>
      <div className="text-[11px] text-base-content/45 mt-1">
        {data.length} readings · last {timeframe.hours || 24}h
      </div>
    </div>
  )
}
