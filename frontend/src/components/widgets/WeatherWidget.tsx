import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { WidgetConfig } from '../../hooks'
import { weatherApi } from '../../api'

type IconProps = {
  className?: string
}

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

const SunIcon = ({ className }: IconProps) => (
  <IconBase className={className}>
    <circle cx="12" cy="12" r="4" />
    <line x1="12" y1="2" x2="12" y2="5" />
    <line x1="12" y1="19" x2="12" y2="22" />
    <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
    <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
    <line x1="2" y1="12" x2="5" y2="12" />
    <line x1="19" y1="12" x2="22" y2="12" />
    <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
    <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
  </IconBase>
)

const CloudIcon = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M5 15a4 4 0 010-8 5 5 0 019.7-.7A4 4 0 0118 15H5z" />
  </IconBase>
)

const PartlyCloudyIcon = ({ className }: IconProps) => (
  <IconBase className={className}>
    <circle cx="8" cy="8" r="3" />
    <path d="M5 17a4 4 0 010-8 5 5 0 019.7-.7A4 4 0 0118 17H5z" />
  </IconBase>
)

const FogIcon = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M4 10h11a3 3 0 000-6 4.5 4.5 0 00-8.91 1" />
    <line x1="3" y1="15" x2="17" y2="15" />
    <line x1="5" y1="19" x2="19" y2="19" />
  </IconBase>
)

const RainIcon = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M5 15a4 4 0 010-8 5 5 0 019.7-.7A4 4 0 0118 15H5z" />
    <line x1="8" y1="17" x2="8" y2="21" />
    <line x1="12" y1="17" x2="12" y2="22" />
    <line x1="16" y1="17" x2="16" y2="21" />
  </IconBase>
)

const SnowIcon = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M5 14a4 4 0 010-8 5 5 0 019.7-.7A4 4 0 0118 14H5z" />
    <line x1="11" y1="16" x2="11" y2="22" />
    <line x1="8.5" y1="18" x2="13.5" y2="20" />
    <line x1="8.5" y1="20" x2="13.5" y2="18" />
  </IconBase>
)

const ThunderIcon = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M5 15a4 4 0 010-8 5 5 0 019.7-.7A4 4 0 0118 15H5z" />
    <polyline points="12 16 10 20 14 20 12 24" />
  </IconBase>
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

const WindIcon = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M3 12h9a3 3 0 10-3-3" />
    <path d="M5 18h11a3 3 0 11-3 3" />
  </IconBase>
)

const CloudCoverIcon = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M6 17a4 4 0 010-8 5 5 0 019.7-.7A4 4 0 0119 17H6z" />
  </IconBase>
)

const RainDropIcon = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M7 14a5 5 0 0010 0c0-4-5-9-5-9s-5 5-5 9z" />
  </IconBase>
)

interface WeatherWidgetProps {
  config: WidgetConfig
}

export default function WeatherWidget({ config }: WeatherWidgetProps) {
  // Get city from config or use default
  const city = (config.visualization as Record<string, unknown>)?.city as string || 'Skopje'

  const { data: weather, isLoading, error } = useQuery({
    queryKey: ['weather', city],
    queryFn: async () => {
      const response = await weatherApi.getCurrent({ city })
      return response.data
    },
    refetchInterval: 300000, // Refresh every 5 minutes
    staleTime: 240000, // Consider fresh for 4 minutes
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
        <div className="card-body">
          <h2 className="card-title text-sm truncate">{config.title}</h2>
          <div className="flex flex-col items-center justify-center flex-1">
            <p className="text-error">Failed to load weather data</p>
          </div>
        </div>
      </div>
    )
  }

  if (!weather) return null

  const getWeatherIcon = (code: number) => {
    if (code === 0 || code === 1) return <SunIcon className="w-16 h-16 text-warning" />
    if (code === 2) return <PartlyCloudyIcon className="w-16 h-16 text-primary" />
    if (code === 3) return <CloudIcon className="w-16 h-16 text-primary" />
    if (code >= 45 && code <= 48) return <FogIcon className="w-16 h-16 text-primary" />
    if (code >= 51 && code <= 55) return <RainIcon className="w-16 h-16 text-primary" />
    if (code >= 61 && code <= 65) return <RainIcon className="w-16 h-16 text-primary" />
    if (code >= 71 && code <= 77) return <SnowIcon className="w-16 h-16 text-primary" />
    if (code >= 80 && code <= 82) return <RainIcon className="w-16 h-16 text-primary" />
    if (code >= 85 && code <= 86) return <SnowIcon className="w-16 h-16 text-primary" />
    if (code >= 95) return <ThunderIcon className="w-16 h-16 text-primary" />
    return <ThermometerIcon className="w-16 h-16 text-primary" />
  }

  return (
    <div className="widget-card card bg-base-100 h-full">
      <div className="card-body">
        <h2 className="card-title text-sm truncate">{config.title}</h2>
        <div className="flex flex-col items-center justify-center flex-1">
          {/* Weather Icon */}
          <div className="mb-1 text-primary">{getWeatherIcon(weather.weather_code)}</div>

          {/* Temperature */}
          <div className="text-3xl font-bold">{weather.temperature.toFixed(1)}°C</div>
          <div className="text-xs text-base-content/60">
            Feels like {weather.apparent_temperature.toFixed(1)}°C
          </div>

          {/* Weather Description */}
          <div className="badge badge-primary mt-1 truncate max-w-full">
            {weather.weather_description}
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-2 gap-2 mt-2 w-full text-xs">
            <div className="flex items-center gap-2">
              <DropletIcon className="w-4 h-4 opacity-70" />
              <span>{weather.humidity}%</span>
            </div>
            <div className="flex items-center gap-2">
              <WindIcon className="w-4 h-4 opacity-70" />
              <span>{weather.wind_speed.toFixed(1)} km/h</span>
            </div>
            <div className="flex items-center gap-2">
              <CloudCoverIcon className="w-4 h-4 opacity-70" />
              <span>{weather.cloud_cover}%</span>
            </div>
            {weather.precipitation > 0 && (
              <div className="flex items-center gap-2">
                <RainDropIcon className="w-4 h-4 opacity-70" />
                <span>{weather.precipitation} mm</span>
              </div>
            )}
          </div>

          {/* Location */}
          <div className="text-xs text-base-content/40 mt-3 px-2 w-full overflow-hidden">
            <div className="truncate text-center">{weather.location}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
