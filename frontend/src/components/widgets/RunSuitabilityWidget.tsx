import { useQuery } from '@tanstack/react-query'
import { wellnessApi } from '../../api'
import { useWellnessState } from '../../hooks/useWellnessState'
import type { WidgetConfig } from '../../hooks'
import './widget-styles.css'

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

const StepIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

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
    refetchInterval: 300000, // Refresh every 5 minutes
    enabled: !!deviceId && !!widgetCity,
  })

  if (isLoading) {
    return (
      <div className="widget-card card bg-base-100 h-full">
        <div className="card-body flex items-center justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="widget-card card bg-base-100 h-full">
        <div className="card-body flex flex-col items-center justify-center text-center gap-2">
          <div className="alert alert-error text-xs">
            <span>
              {error instanceof Error ? error.message : 'No data available'}
            </span>
          </div>
          {(!deviceId || !widgetCity) && (
            <p className="text-xs text-base-content/60">
              {!deviceId && 'Select a health device'}
              {!deviceId && !widgetCity && ' and '}
              {!widgetCity && 'Select a city'}
            </p>
          )}
        </div>
      </div>
    )
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
    <div className="widget-card card bg-base-100 h-full flex flex-col">
      <div className="card-body p-3 flex flex-col gap-2 flex-1 min-h-0">
        <h2 className="card-title text-sm mb-2">{config.title}</h2>
        
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
            <div className="flex gap-2 text-xs text-base-content/60 justify-center">
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
                <span className="text-success"><CheckIcon /></span>
                <span className="opacity-80">{data.suggestions[0]}</span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Health Stats */}
        <div className="text-xs text-base-content/60 flex gap-2 justify-center pt-1 border-t border-base-300 flex-shrink-0 mt-auto">
          <span className="flex items-center gap-1">
            <StepIcon />
            {data.health_data.steps.toLocaleString()} steps
          </span>
        </div>
      </div>
    </div>
  )
}
