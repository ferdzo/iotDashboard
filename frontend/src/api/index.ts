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
  getAll: () => apiClient.get<PaginatedResponse<Device>>('/devices/'),
  
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
};

// Dashboard API
export const dashboardApi = {
  getOverview: () => apiClient.get<DashboardOverview>('/dashboard/overview/'),
};
