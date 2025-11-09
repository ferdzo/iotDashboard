import { useQuery } from '@tanstack/react-query'
import { telemetryApi } from '../api'
import type { Telemetry } from '../types/api'

interface TelemetrySeriesParams {
  deviceId?: string
  metric?: string
  hours?: number
  startTime?: string
  endTime?: string
  limit?: number
  enabled?: boolean
}

interface TelemetrySeries {
  data: Telemetry[]
  isLoading: boolean
  isFetching: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Hook to fetch telemetry data series with flexible filtering
 */
export function useTelemetrySeries({
  deviceId,
  metric,
  hours = 24,
  startTime,
  endTime,
  limit = 1000,
  enabled = true,
}: TelemetrySeriesParams): TelemetrySeries {
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['telemetry', 'series', { deviceId, metric, hours, startTime, endTime, limit }],
    queryFn: async () => {
      const params: {
        device_id?: string
        metric?: string
        hours?: number
        start_time?: string
        end_time?: string
        page_size: number
      } = {
        page_size: limit,
      }

      if (deviceId) params.device_id = deviceId
      if (metric) params.metric = metric
      if (startTime) params.start_time = startTime
      if (endTime) params.end_time = endTime
      if (!startTime && !endTime && hours) params.hours = hours

      const response = await telemetryApi.query(params)
      
      // Handle paginated response
      if ('results' in response.data) {
        return response.data.results
      }
      
      return response.data as Telemetry[]
    },
    enabled,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  return {
    data: data || [],
    isLoading,
    isFetching,
    error: error as Error | null,
    refetch,
  }
}
