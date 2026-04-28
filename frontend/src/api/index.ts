import apiClient from '../lib/api-client';
import type {
  Device,
  DeviceRegistrationRequest,
  DeviceRegistrationResponse,
  Telemetry,
  DashboardOverview,
} from '../types/api';

// Paginated response type from Django REST Framework
interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Device API
export const devicesApi = {
  getAll: async () => {
    const response = await apiClient.get<Device[] | PaginatedResponse<Device>>('/devices/');
    // Handle both paginated and non-paginated responses
    if (Array.isArray(response.data)) {
      // Non-paginated response - wrap it
      return {
        ...response,
        data: {
          count: response.data.length,
          next: null,
          previous: null,
          results: response.data,
        },
      };
    }
    // Already paginated
    return response as typeof response & { data: PaginatedResponse<Device> };
  },
  
  getOne: (id: string) => apiClient.get<Device>(`/devices/${id}/`),
  
  create: (data: DeviceRegistrationRequest) =>
    apiClient.post<DeviceRegistrationResponse>('/devices/', data),
  
  delete: (id: string) => apiClient.delete(`/devices/${id}/`),
  
  revoke: (id: string) => apiClient.post(`/devices/${id}/revoke/`),
  
  renew: (id: string) =>
    apiClient.post<DeviceRegistrationResponse>(`/devices/${id}/renew/`),
  
  getTelemetry: (id: string, params?: {
    metric?: string;
    hours?: number;
    limit?: number;
  }) => apiClient.get<Telemetry[]>(`/devices/${id}/telemetry/`, { params }),
  
  getMetrics: (id: string) =>
    apiClient.get<{ device_id: string; device_name: string; metrics: string[] }>(
      `/devices/${id}/metrics/`
    ),
  
  getComfortIndex: (id: string) =>
    apiClient.get<{
      device_id: string;
      device_name: string;
      overall_score: number;
      rating: string;
      components: {
        temperature: number;
        humidity: number;
        air_quality: number;
        acoustic: number;
        light: number;
      };
      suggestions: string[];
      raw_readings: Record<string, number>;
    }>(`/devices/${id}/comfort_index/`),
};

// Telemetry API
export const telemetryApi = {
  query: (params?: {
    device_id?: string;
    metric?: string;
    hours?: number;
    start_time?: string;
    end_time?: string;
    page_size?: number;
    page?: number;
  }) => apiClient.get<PaginatedResponse<Telemetry>>('/telemetry/', { params }),
  
  getLatest: (params?: { limit?: number }) =>
    apiClient.get<PaginatedResponse<Telemetry>>('/telemetry/latest/', { params }),
  
  getMetrics: () => apiClient.get<{ metrics: string[] }>('/telemetry/metrics/'),
  
  analyze: (data: {
    device_id: string;
    metric?: string;
    metrics?: string[];  // Support multiple metrics
    hours?: number;
    limit?: number;
    prompt_type?: 'anomaly_detection' | 'trend_summary' | 'custom';
    custom_prompt?: string;
  }) => apiClient.post<{
    analysis: string;
    prompt_type: string;
    data_points_analyzed: number;
  }>('/telemetry/analyze/', data),
};

// Dashboard API
export const dashboardApi = {
  getOverview: () => apiClient.get<DashboardOverview>('/dashboard/overview/'),
};

// Weather API
export const weatherApi = {
  getCurrent: (params: { city?: string; lat?: number; lon?: number }) =>
    apiClient.get<{
      location: string;
      temperature: number;
      apparent_temperature: number;
      humidity: number;
      weather_description: string;
      weather_code: number;
      precipitation: number;
      rain: number;
      cloud_cover: number;
      wind_speed: number;
      wind_direction: number;
      time: string;
      timezone: string;
    }>('/weather/current/', { params }),

  getAirQuality: (city: string) =>
    apiClient.get<{
      city: string;
      measurements: Record<string, {
        average: number;
        min: number;
        max: number;
        count: number;
      }>;
      status: string;
      timestamp: string;
      sensor_count: number;
    }>('/weather/air_quality/', { params: { city } }),
};

// Dashboard Layout API
export const dashboardLayoutApi = {
  getAll: () =>
    apiClient.get<Array<{
      id: number
      name: string
      config: any
      is_default: boolean
      created_at: string
      updated_at: string
    }>>('/dashboard-layouts/'),

  getDefault: () =>
    apiClient.get<{
      id: number
      name: string
      config: any
      is_default: boolean
      created_at: string
      updated_at: string
    }>('/dashboard-layouts/default/'),

  create: (data: {
    name: string
    config: any
    is_default?: boolean
  }) =>
    apiClient.post('/dashboard-layouts/', data),

  update: (id: number, data: {
    name?: string
    config?: any
    is_default?: boolean
  }) =>
    apiClient.put(`/dashboard-layouts/${id}/`, data),

  delete: (id: number) =>
    apiClient.delete(`/dashboard-layouts/${id}/`),

  setDefault: (id: number) =>
    apiClient.post(`/dashboard-layouts/${id}/set_default/`),
}

// Wellness API
export const wellnessApi = {
  getRunSuitability: (healthDeviceId: string, city: string, timeOfDay?: string) =>
    apiClient.get<{
      status: 'GO' | 'MODERATE' | 'NO';
      overall_score: number;
      scores: {
        weather: number;
        air_quality: number;
        health: number;
      };
      primary_reason: string;
      detailed_insights: string[];
      time_recommendations: string[];
      suggestions: string[];
      weather_data: {
        temperature: number;
        wind_speed: number;
        precipitation: number;
        description: string;
      };
      air_quality_data: {
        pm25: number | null;
        pm10: number | null;
        status: string;
      };
      health_data: {
        steps: number;
        active_calories: number;
        heart_rate: number | null;
      };
    }>('/wellness/run_suitability/', {
      params: {
        health_device_id: healthDeviceId,
        city,
        ...(timeOfDay && { time_of_day: timeOfDay }),
      },
    }),

  getHealthInsights: (healthDeviceId: string, city?: string) =>
    apiClient.get<{
      health_metrics: {
        steps: number;
        active_calories: number;
        heart_rate: number | null;
        resting_heart_rate: number | null;
      };
      environmental_context: {
        temperature: number | null;
        humidity: number | null;
        pm25: number | null;
        pm10: number | null;
        air_quality_status: string | null;
        weather_description: string | null;
      };
      insights: Array<{
        metric: string;
        value: number;
        context: string;
        correlation: string | null;
        recommendation: string | null;
      }>;
      correlations: string[];
      recommendations: string[];
      trend_indicators: string[];
    }>('/wellness/health_insights/', {
      params: {
        health_device_id: healthDeviceId,
        ...(city && { city }),
      },
    }),

  getDailyBriefing: (params: {
    briefing_type: 'schedule' | 'environment' | 'full';
    city: string;
    health_device_id?: string;
    calendar_url?: string;
    calendar_range_hours?: number;
  }) =>
    apiClient.post<{
      status_emoji: string;
      status_line: string;
      insights: string[];
      recommendations: string[];
      briefing_type: string;
      generated_at: string;
      context: {
        indoor: Record<string, number> | null;
        outdoor: Record<string, number | string | null> | null;
        health: Record<string, number> | null;
        calendar_event_count: number;
      };
    }>('/wellness/daily_briefing/', params),
};

// Calendar API
export const calendarApi = {
  fetch: (calendarUrl: string, options?: { signal?: AbortSignal }) =>
    apiClient.get<{ calendar_data: string }>('/calendar/fetch/', {
      params: { calendar_url: calendarUrl },
      signal: options?.signal,
    }),
};
