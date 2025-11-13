import { useQuery } from '@tanstack/react-query'
import type { WidgetConfig } from '../../hooks'
import { weatherApi } from '../../api'

interface AirQualityWidgetProps {
  config: WidgetConfig
}

export default function AirQualityWidget({ config }: AirQualityWidgetProps) {
  // Get city from config or use default (Pulse.eco city)
  const city = (config.visualization as Record<string, unknown>)?.city as string || 'skopje'

  const { data: airQuality, isLoading, error } = useQuery({
    queryKey: ['air-quality', city],
    queryFn: async () => {
      const response = await weatherApi.getAirQuality(city)
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
            <p className="text-error text-sm text-center">
              Failed to load air quality data for {city}
            </p>
            <p className="text-xs text-base-content/60 mt-2">
              Try: skopje, bitola, tetovo
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!airQuality) return null

  // Get AQI color based on status
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'good':
        return 'success'
      case 'moderate':
        return 'warning'
      case 'unhealthy for sensitive groups':
      case 'unhealthy':
        return 'error'
      case 'very unhealthy':
      case 'hazardous':
        return 'error'
      default:
        return 'base-content/40'
    }
  }

  const statusColor = getStatusColor(airQuality.status)
  const pm10 = airQuality.measurements.pm10
  const pm25 = airQuality.measurements.pm25

  return (
    <div className="card bg-base-100 shadow-lg h-full">
      <div className="card-body">
        <h2 className="card-title text-sm">{config.title}</h2>
        <div className="flex flex-col items-center justify-center flex-1">
          {/* Air quality icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-16 w-16 text-${statusColor} mb-2`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
            />
          </svg>

          {/* PM Values */}
          <div className="grid grid-cols-2 gap-4 w-full mb-3">
            {pm10 && (
              <div className="text-center">
                <div className="text-2xl font-bold">{pm10.average.toFixed(1)}</div>
                <div className="text-xs text-base-content/60">PM10 μg/m³</div>
              </div>
            )}
            {pm25 && (
              <div className="text-center">
                <div className="text-2xl font-bold">{pm25.average.toFixed(1)}</div>
                <div className="text-xs text-base-content/60">PM2.5 μg/m³</div>
              </div>
            )}
          </div>

          {/* AQI Status badge */}
          <div className={`badge badge-${statusColor} badge-lg`}>
            {airQuality.status}
          </div>

          {/* Additional pollutants */}
          <div className="grid grid-cols-2 gap-2 mt-3 w-full text-xs">
            {Object.entries(airQuality.measurements).map(([pollutant, data]) => {
              if (pollutant === 'pm10' || pollutant === 'pm25') return null
              return (
                <div key={pollutant} className="flex justify-between">
                  <span className="opacity-60">{pollutant.toUpperCase()}:</span>
                  <span className="font-semibold">{data.average.toFixed(1)}</span>
                </div>
              )
            })}
          </div>

          {/* City and sensor count */}
          <div className="text-xs text-base-content/40 mt-3">
            {airQuality.city.charAt(0).toUpperCase() + airQuality.city.slice(1)} • {airQuality.sensor_count} sensors
          </div>
        </div>
      </div>
    </div>
  )
}
