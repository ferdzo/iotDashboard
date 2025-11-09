import { useQuery } from '@tanstack/react-query'
import { devicesApi, telemetryApi } from '../api'

interface DeviceMetricsResult {
  deviceId: string
  deviceName: string
  metrics: string[]
  isLoading: boolean
  error: Error | null
}

/**
 * Hook to fetch available metrics for a specific device
 */
export function useDeviceMetrics(deviceId: string | undefined): DeviceMetricsResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ['device', deviceId, 'metrics'],
    queryFn: async () => {
      if (!deviceId) return null
      const response = await devicesApi.getMetrics(deviceId)
      return response.data
    },
    enabled: !!deviceId,
    staleTime: 60000, // Cache for 1 minute
  })

  return {
    deviceId: data?.device_id || '',
    deviceName: data?.device_name || '',
    metrics: data?.metrics || [],
    isLoading,
    error: error as Error | null,
  }
}

/**
 * Hook to fetch all available metrics across all devices
 */
export function useAllMetrics() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['telemetry', 'metrics'],
    queryFn: async () => {
      const response = await telemetryApi.getMetrics()
      return response.data.metrics
    },
    staleTime: 60000,
  })

  return {
    metrics: data || [],
    isLoading,
    error: error as Error | null,
  }
}
