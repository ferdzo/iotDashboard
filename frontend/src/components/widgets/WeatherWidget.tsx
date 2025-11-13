import { useQuery } from '@tanstack/react-query'
import type { WidgetConfig } from '../../hooks'
import { weatherApi } from '../../api'

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
      <div className="card bg-base-100 shadow-lg h-full">
        <div className="card-body flex items-center justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card bg-base-100 shadow-lg h-full">
        <div className="card-body">
          <h2 className="card-title text-sm">{config.title}</h2>
          <div className="flex flex-col items-center justify-center flex-1">
            <p className="text-error">Failed to load weather data</p>
          </div>
        </div>
      </div>
    )
  }

  if (!weather) return null

  // Weather code to icon mapping
  const getWeatherIcon = (code: number) => {
    if (code === 0 || code === 1) return '☀️' // Clear/Mainly clear
    if (code === 2) return '⛅' // Partly cloudy
    if (code === 3) return '☁️' // Overcast
    if (code >= 45 && code <= 48) return '🌫️' // Fog
    if (code >= 51 && code <= 55) return '🌦️' // Drizzle
    if (code >= 61 && code <= 65) return '🌧️' // Rain
    if (code >= 71 && code <= 77) return '🌨️' // Snow
    if (code >= 80 && code <= 82) return '🌧️' // Rain showers
    if (code >= 85 && code <= 86) return '🌨️' // Snow showers
    if (code >= 95) return '⛈️' // Thunderstorm
    return '🌡️'
  }

  return (
    <div className="card bg-base-100 shadow-lg h-full">
      <div className="card-body">
        <h2 className="card-title text-sm">{config.title}</h2>
        <div className="flex flex-col items-center justify-center flex-1">
          {/* Weather Icon */}
          <div className="text-6xl mb-2">{getWeatherIcon(weather.weather_code)}</div>

          {/* Temperature */}
          <div className="text-4xl font-bold">{weather.temperature.toFixed(1)}°C</div>
          <div className="text-sm text-base-content/60">
            Feels like {weather.apparent_temperature.toFixed(1)}°C
          </div>

          {/* Weather Description */}
          <div className="badge badge-primary badge-lg mt-2">
            {weather.weather_description}
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-2 gap-4 mt-4 w-full text-sm">
            <div className="flex items-center gap-2">
              <span className="opacity-60">💧</span>
              <span>{weather.humidity}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="opacity-60">💨</span>
              <span>{weather.wind_speed.toFixed(1)} km/h</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="opacity-60">☁️</span>
              <span>{weather.cloud_cover}%</span>
            </div>
            {weather.precipitation > 0 && (
              <div className="flex items-center gap-2">
                <span className="opacity-60">🌧️</span>
                <span>{weather.precipitation} mm</span>
              </div>
            )}
          </div>

          {/* Location */}
          <div className="text-xs text-base-content/40 mt-3">{weather.location}</div>
        </div>
      </div>
    </div>
  )
}
