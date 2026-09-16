import { useQuery } from '@tanstack/react-query'
import { wellnessApi } from '../../api'
import { useWellnessState } from '../../hooks/useWellnessState'
import type { WidgetConfig } from '../../hooks'
import { WidgetSkeleton, WidgetError, WidgetEmpty } from '../ui'
import Icon from '../Icon'

interface RunSuitabilityWidgetProps {
  config: WidgetConfig
}

export default function RunSuitabilityWidget({ config }: RunSuitabilityWidgetProps) {
  const { healthDeviceId, city } = useWellnessState()
  
  // Use device from config or shared state
  const deviceId = config.deviceIds[0] || healthDeviceId
  const widgetCity = (config.visualization as Record<string, unknown>)?.city as string || city

  const { data, isLoading, error } = useQuery({
    queryKey: ['run-suitability', deviceId, widgetCity],
    queryFn: async () => {
      if (!deviceId || !widgetCity) {
        throw new Error('Device ID and city are required')
      }
      const response = await wellnessApi.getRunSuitability(deviceId, widgetCity)
      return response.data
    },
    refetchInterval: 5000, // Refresh every 5 seconds
    enabled: !!deviceId && !!widgetCity,
  })

  if (!deviceId || !widgetCity) {
    return <WidgetEmpty message="Select a health device and a city" />
  }

  if (isLoading) return <WidgetSkeleton lines={3} />

  if (error || !data) {
    return <WidgetError message={error instanceof Error ? error.message : 'No data available'} />
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'GO': return 'text-success'
      case 'MODERATE': return 'text-warning'
      case 'NO': return 'text-error'
      default: return 'text-base-content'
    }
  }

  const getBgColor = (status: string) => {
    switch (status) {
      case 'GO': return 'bg-success/10 border-success/20'
      case 'MODERATE': return 'bg-warning/10 border-warning/20'
      case 'NO': return 'bg-error/10 border-error/20'
      default: return 'bg-base-200'
    } 
  }

  return (
    <div className="flex flex-col gap-2 min-h-0">
        {/* Status Badge */}
        <div className="flex flex-col items-center justify-center text-center gap-2">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 ${getStatusColor(data.status)} ${getBgColor(data.status)}`}>
            <span className={`text-2xl font-black ${getStatusColor(data.status)}`}>
              {data.status}
            </span>
          </div>

          {/* Primary Reason */}
          <div className="space-y-1">
            <p className="font-medium text-sm">{data.primary_reason}</p>
            
            {/* Score Breakdown */}
            <div className="flex gap-2 text-xs text-base-content/60 justify-center tnum">
              <span>Weather: {data.scores.weather.toFixed(0)}</span>
              <span>•</span>
              <span>Air: {data.scores.air_quality.toFixed(0)}</span>
              <span>•</span>
              <span>Health: {data.scores.health.toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Detailed Insights */}
        {data.detailed_insights.length > 0 && (
          <div className="space-y-1 mt-1">
            <div className="text-xs font-semibold opacity-70">Conditions:</div>
            <ul className="text-xs space-y-0.5">
              {data.detailed_insights.slice(0, 2).map((insight, i) => (
                <li key={i} className="opacity-80">• {insight}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Time Recommendations */}
        {data.time_recommendations.length > 0 && (
          <div className="space-y-1 mt-1">
            <div className="text-xs font-semibold opacity-70">Best Time:</div>
            <div className="text-xs opacity-80">• {data.time_recommendations[0]}</div>
          </div>
        )}

        {/* Suggestions */}
        {data.suggestions.length > 0 && (
          <div className="mt-1 pt-1 border-t border-base-300">
            <div className="text-xs">
              <div className="flex items-start gap-1.5">
                <span className="text-success"><Icon name="check" className="size-4" /></span>
                <span className="opacity-80">{data.suggestions[0]}</span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Health Stats */}
        <div className="text-xs text-base-content/60 flex gap-2 justify-center pt-1 border-t border-base-300 flex-shrink-0 mt-auto">
          <span className="flex items-center gap-1 tnum">
            {(data.health_data?.steps ?? null) !== null ? (
              <>{data.health_data.steps.toLocaleString()} steps</>
            ) : (
              <>— steps</>
            )}
          </span>
        </div>
    </div>
  )
}
