import { useQuery } from '@tanstack/react-query'
import { wellnessApi } from '../../api'
import { useWellnessState } from '../../hooks/useWellnessState'
import type { WidgetConfig } from '../../hooks'
import './widget-styles.css'

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

  if (isLoading) {
    return (
      <div className="widget-card card bg-base-100 h-full">
        <div className="card-body flex items-center justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="widget-card card bg-base-100 h-full">
        <div className="card-body flex items-center justify-center">
          <div className="alert alert-error text-xs">
            <span>
              {error instanceof Error ? error.message : 'Failed to load health data'}
            </span>
          </div>
          {!deviceId && (
            <p className="text-xs text-base-content/60 mt-2">Select a health device</p>
          )}
        </div>
      </div>
    )
  }

  if (!data) return null

  const StepIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )

  const FireIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
    </svg>
  )

  const HeartIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  )

  const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )

  const WarningIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  )

  const stats = [
    { 
      label: 'Steps', 
      value: data.health_metrics.steps, 
      unit: '', 
      icon: <StepIcon />, 
      color: 'text-primary' 
    },
    { 
      label: 'Calories', 
      value: data.health_metrics.active_calories, 
      unit: 'kcal', 
      icon: <FireIcon />, 
      color: 'text-secondary' 
    },
    { 
      label: 'Heart Rate', 
      value: data.health_metrics.heart_rate, 
      unit: 'bpm', 
      icon: <HeartIcon />, 
      color: 'text-error' 
    },
  ]

  // Find insights for each stat
  const getInsightForMetric = (metric: string) => {
    return data.insights.find(i => i.metric === metric)
  }

  return (
    <div className="widget-card card bg-base-100 h-full flex flex-col">
      <div className="card-body p-3 flex-1 min-h-0">
        <h2 className="card-title text-sm mb-3">{config.title}</h2>
        
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
                    <span className={`text-xl font-bold ${stat.color}`}>
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
                        <WarningIcon />
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
                <span className="text-success"><CheckIcon /></span>
                <span className="opacity-80">{data.recommendations[0]}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
