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
