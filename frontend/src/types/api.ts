export interface Device {
  id: string;
  name: string;
  location?: string;
  protocol: 'mqtt' | 'http' | 'webhook';
  connection_config?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  certificate_status?: string;
  certificate_expires_at?: string;
  active_certificate?: DeviceCertificate;
}

export interface DeviceCertificate {
  id: string;
  device_id: string;
  issued_at: string;
  expires_at: string;
  revoked_at?: string;
  is_revoked: boolean;
  is_expired: boolean;
  is_expiring_soon: boolean;
  is_valid: boolean;
  days_until_expiry: number;
}

export interface Telemetry {
  time: string;
  device_id: string;
  device_name: string;
  metric: string;
  value: number;
  unit?: string;
}

export interface DeviceRegistrationRequest {
  name: string;
  location?: string;
  protocol?: 'mqtt' | 'http' | 'webhook';
  connection_config?: Record<string, any>;
}

export interface DeviceRegistrationResponse {
  device_id: string;
  protocol: string;
  certificate_id?: string;
  ca_certificate_pem?: string;
  certificate_pem?: string;
  private_key_pem?: string;
  expires_at?: string;
  onboarding_token?: string;  // One-time token for secure onboarding (valid 15 min)
}

export interface DashboardOverview {
  total_devices: number;
  active_devices: number;
  mqtt_devices: number;
  http_devices: number;
  certificates_expiring_soon: number;
  recent_telemetry: Telemetry[];
  devices_with_metrics: {
    device_id: string;
    device_name: string;
    metrics: string[];
  }[];
}
