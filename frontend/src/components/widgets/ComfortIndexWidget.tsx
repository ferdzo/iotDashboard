import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { devicesApi } from '../../api'
import type { WidgetConfig } from '../../hooks'
import './widget-styles.css'

type IconProps = { className?: string }

const IconBase = ({ className, children }: IconProps & { children: ReactNode }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
)

const ThermometerIcon = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M14 14.5V5a2 2 0 00-4 0v9.5a3.5 3.5 0 104 0z" />
    <line x1="12" y1="8" x2="12" y2="11" />
  </IconBase>
)

const DropletIcon = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M12 3.5s-4 5-4 8.5a4 4 0 108 0c0-3.5-4-8.5-4-8.5z" />
  </IconBase>
)

const AirQualityIcon = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M4 12h9a3 3 0 10-3-3" />
    <path d="M6 17h8a3 3 0 11-3 3" />
  </IconBase>
)

const AcousticIcon = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M5 9v6h3l4 4V5l-4 4H5z" />
    <path d="M16 9a4 4 0 010 6" />
    <path d="M18 7a6 6 0 010 10" />
  </IconBase>
)

const LightIcon = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M12 3a5 5 0 00-3 9v3h6v-3a5 5 0 00-3-9z" />
    <path d="M10 18h4" />
    <path d="M10 21h4" />
  </IconBase>
)

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
            <ThermometerIcon className="w-4 h-4" />
            <span className="truncate">Temperature</span>
          </div>
          <span className={`font-bold ${getScoreColor(data.components.temperature)}`}>
            {data.components.temperature}
          </span>
        </div>
        
        <div className="flex items-center justify-between p-2 bg-base-200 rounded">
          <div className="flex items-center gap-1.5">
            <DropletIcon className="w-4 h-4" />
            <span className="truncate">Humidity</span>
          </div>
          <span className={`font-bold ${getScoreColor(data.components.humidity)}`}>
            {data.components.humidity}
          </span>
        </div>
        
        <div className="flex items-center justify-between p-2 bg-base-200 rounded">
          <div className="flex items-center gap-1.5">
            <AirQualityIcon className="w-4 h-4" />
            <span className="truncate">Air Quality</span>
          </div>
          <span className={`font-bold ${getScoreColor(data.components.air_quality)}`}>
            {data.components.air_quality}
          </span>
        </div>
        
        <div className="flex items-center justify-between p-2 bg-base-200 rounded">
          <div className="flex items-center gap-1.5">
            <AcousticIcon className="w-4 h-4" />
            <span className="truncate">Acoustic</span>
          </div>
          <span className={`font-bold ${getScoreColor(data.components.acoustic)}`}>
            {data.components.acoustic}
          </span>
        </div>
        
        <div className="flex items-center justify-between p-2 bg-base-200 rounded col-span-2">
          <div className="flex items-center gap-1.5">
            <LightIcon className="w-4 h-4" />
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
          <div className="flex items-center gap-1 text-xs font-semibold mb-1">
            <LightIcon className="w-3.5 h-3.5" />
            <span>Suggestions</span>
          </div>
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
