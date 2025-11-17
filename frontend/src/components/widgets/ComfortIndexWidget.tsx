import { useQuery } from '@tanstack/react-query'
import { devicesApi } from '../../api'
import type { WidgetConfig } from '../../hooks'
import './widget-styles.css'

interface ComfortIndexWidgetProps {
  config: WidgetConfig
}

export default function ComfortIndexWidget({ config }: ComfortIndexWidgetProps) {
  const deviceId = config.deviceIds[0]

  const { data, isLoading, error } = useQuery({
    queryKey: ['comfort-index', deviceId],
    queryFn: async () => {
      const response = await devicesApi.getComfortIndex(deviceId)
      return response.data
    },
    refetchInterval: 60000, // Refresh every minute
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

  if (error || !data) {
    return (
      <div className="widget-card card bg-base-100 h-full">
        <div className="card-body flex items-center justify-center">
          <div className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Failed to load comfort index</span>
          </div>
        </div>
      </div>
    )
  }

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'Excellent': return 'text-success'
      case 'Good': return 'text-info'
      case 'Fair': return 'text-warning'
      case 'Poor': return 'text-error'
      case 'Very Poor': return 'text-error'
      default: return 'text-base-content'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-success'
    if (score >= 75) return 'text-info'
    if (score >= 60) return 'text-warning'
    if (score >= 40) return 'text-error'
    return 'text-error'
  }

  return (
    <div className="widget-card card bg-base-100 h-full">
      <div className="card-body p-3 gap-2">
        {/* Title */}
        <h2 className="card-title text-sm mb-1">{config.title}</h2>
        
        {/* Overall Score */}
        <div className="text-center">
          <div className={`text-4xl font-bold ${getScoreColor(data.overall_score)}`}>
            {data.overall_score}
          </div>
          <div className={`text-lg font-semibold ${getRatingColor(data.rating)} mt-0.5`}>
            {data.rating}
          </div>
          <div className="text-xs text-base-content/60">Comfort Index</div>
        </div>

      {/* Component Scores */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center justify-between p-2 bg-base-200 rounded">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">🌡️</span>
            <span className="truncate">Temperature</span>
          </div>
          <span className={`font-bold ${getScoreColor(data.components.temperature)}`}>
            {data.components.temperature}
          </span>
        </div>
        
        <div className="flex items-center justify-between p-2 bg-base-200 rounded">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">💧</span>
            <span className="truncate">Humidity</span>
          </div>
          <span className={`font-bold ${getScoreColor(data.components.humidity)}`}>
            {data.components.humidity}
          </span>
        </div>
        
        <div className="flex items-center justify-between p-2 bg-base-200 rounded">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">🌬️</span>
            <span className="truncate">Air Quality</span>
          </div>
          <span className={`font-bold ${getScoreColor(data.components.air_quality)}`}>
            {data.components.air_quality}
          </span>
        </div>
        
        <div className="flex items-center justify-between p-2 bg-base-200 rounded">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">🔊</span>
            <span className="truncate">Acoustic</span>
          </div>
          <span className={`font-bold ${getScoreColor(data.components.acoustic)}`}>
            {data.components.acoustic}
          </span>
        </div>
        
        <div className="flex items-center justify-between p-2 bg-base-200 rounded col-span-2">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">💡</span>
            <span className="truncate">Lighting</span>
          </div>
          <span className={`font-bold ${getScoreColor(data.components.light)}`}>
            {data.components.light}
          </span>
        </div>
      </div>

      {/* Suggestions */}
      {data.suggestions.length > 0 && (
        <div className="mt-auto">
          <div className="text-xs font-semibold mb-1">💡 Suggestions</div>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {data.suggestions.map((suggestion, i) => (
              <div key={i} className="text-xs bg-warning/10 p-1 rounded border-l-2 border-warning">
                {suggestion}
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
