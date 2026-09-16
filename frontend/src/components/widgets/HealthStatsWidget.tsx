import { useQuery } from '@tanstack/react-query'
import { wellnessApi } from '../../api'
import { useWellnessState } from '../../hooks/useWellness'
import type { WidgetConfig } from '../../hooks'
import { WidgetSkeleton, WidgetError, WidgetEmpty } from '../ui'
import Icon from '../Icon'

interface HealthStatsWidgetProps {
  config: WidgetConfig
}

export default function HealthStatsWidget({ config }: HealthStatsWidgetProps) {
  const { healthDeviceId, city } = useWellnessState()

  // Use device from config or shared state
  const deviceId = config.deviceIds[0] || healthDeviceId
  const widgetCity = (config.visualization as Record<string, unknown>)?.city as string || city

  const { data, isLoading, error } = useQuery({
    queryKey: ['health-insights', deviceId, widgetCity],
    queryFn: async () => {
      if (!deviceId) {
        throw new Error('Device ID is required')
      }
      const response = await wellnessApi.getHealthInsights(deviceId, widgetCity || undefined)
      return response.data
    },
    refetchInterval: 5000, // Refresh every 5 seconds
    enabled: !!deviceId,
  })

  if (!deviceId) return <WidgetEmpty message="Select a health device" />

  if (isLoading) return <WidgetSkeleton lines={3} />

  if (error) {
    return <WidgetError message={error instanceof Error ? error.message : 'Failed to load health data'} />
  }

  if (!data) return <WidgetEmpty message="No health data" />

  const stats = [
    {
      label: 'Steps',
      value: data.health_metrics.steps,
      unit: '',
      icon: <Icon name="chart-bars" className="size-5" />,
      color: 'text-primary'
    },
    {
      label: 'Calories',
      value: data.health_metrics.active_calories,
      unit: 'kcal',
      icon: <Icon name="flame" className="size-5" />,
      color: 'text-secondary'
    },
    {
      label: 'Heart Rate',
      value: data.health_metrics.heart_rate,
      unit: 'bpm',
      icon: <Icon name="heart" className="size-5" />,
      color: 'text-error'
    },
  ]

  // Find insights for each stat
  const getInsightForMetric = (metric: string) => {
    return data.insights.find(i => i.metric === metric)
  }

  return (
    <div className="flex flex-col gap-2 min-h-0">
        {/* Health Stats */}
        <div className="space-y-3">
          {stats.map((stat, i) => {
            const insight = getInsightForMetric(stat.label)
            const hasValue = stat.value !== null && stat.value !== undefined

            return (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={stat.color}>{stat.icon}</span>
                    <span className="text-sm opacity-70">{stat.label}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-xl font-bold tracking-tight tnum ${stat.color}`}>
                      {hasValue ? Math.round(Number(stat.value)).toLocaleString() : '—'}
                    </span>
                    {hasValue && <span className="text-xs opacity-50">{stat.unit}</span>}
                  </div>
                </div>

                {/* Context/Correlation */}
                {insight && (
                  <div className="text-xs space-y-0.5 ml-7">
                    {insight.context && (
                      <div className="opacity-70">{insight.context}</div>
                    )}
                    {insight.correlation && (
                      <div className="text-warning opacity-80 flex items-center gap-1">
                        <Icon name="alert" className="size-4" />
                        {insight.correlation}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Recommendations */}
        {data.recommendations.length > 0 && (
          <div className="mt-2 pt-2 border-t border-base-300">
            <div className="text-xs">
              <div className="flex items-start gap-1.5">
                <span className="text-success"><Icon name="check" className="size-4" /></span>
                <span className="opacity-80">{data.recommendations[0]}</span>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}
