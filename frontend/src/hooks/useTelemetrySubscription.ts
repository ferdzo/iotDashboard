import { useTelemetrySeries } from './useTelemetrySeries'
import type { Telemetry } from '../types/api'

/**
 * Transport used by {@link useTelemetrySubscription}.
 *
 * Polling is the only transport today. The `'websocket'` literal is reserved
 * for the Phase-3 live-update work so call sites can adopt the field now
 * without a signature change later.
 */
export type TelemetryTransport = 'polling' | 'websocket'

export interface TelemetrySubscriptionParams {
  deviceId?: string
  metric?: string
  hours?: number
  startTime?: string
  endTime?: string
  limit?: number
  enabled?: boolean
  /**
   * Desired transport. Only `'polling'` (the default) is honored today;
   * any other value is accepted for forward compatibility but falls back
   * to polling so behavior never changes silently.
   */
  transport?: TelemetryTransport
  /**
   * Phase-3 hook point: invoked per reading once a push transport lands.
   * Never called by the polling transport today.
   */
  onMessage?: (reading: Telemetry) => void
}

export interface TelemetrySubscription {
  data: Telemetry[]
  isLoading: boolean
  isFetching: boolean
  error: Error | null
  refetch: () => void
  /** Transport actually in use. Always `'polling'` until Phase-3. */
  transport: Extract<TelemetryTransport, 'polling'>
  /** True while the polling loop is active (mirrors `enabled`). */
  connected: boolean
}

/**
 * Subscription-ready telemetry hook.
 *
 * Polling-backed today: delegates 1:1 to {@link useTelemetrySeries}, so the
 * query key, fetcher, and returned data are identical. The signature is
 * WS-compatible for Phase-3 (`transport` / `onMessage` are accepted but
 * inert until a push transport is implemented).
 */
export function useTelemetrySubscription(params: TelemetrySubscriptionParams): TelemetrySubscription {
  const enabled = params.enabled ?? true
  const { data, isLoading, isFetching, error, refetch } = useTelemetrySeries({
    deviceId: params.deviceId,
    metric: params.metric,
    hours: params.hours,
    startTime: params.startTime,
    endTime: params.endTime,
    limit: params.limit,
    enabled,
  })

  return {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
    transport: 'polling',
    connected: enabled,
  }
}
