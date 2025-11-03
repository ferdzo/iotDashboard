"""DRF serializers for IoT Dashboard models."""

from rest_framework import serializers
from iotDashboard.models import Device, DeviceCertificate, Telemetry


class DeviceCertificateSerializer(serializers.ModelSerializer):
    """Serializer for device certificates."""
    
    is_revoked = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()
    is_expiring_soon = serializers.ReadOnlyField()
    is_valid = serializers.ReadOnlyField()
    days_until_expiry = serializers.ReadOnlyField()
    
    class Meta:
        model = DeviceCertificate
        fields = [
            'id', 'device_id', 'issued_at', 'expires_at', 
            'revoked_at', 'is_revoked', 'is_expired', 
            'is_expiring_soon', 'is_valid', 'days_until_expiry'
        ]
        # Don't expose private keys in API
        # certificate_pem and private_key_pem are excluded by default


class DeviceSerializer(serializers.ModelSerializer):
    """Serializer for devices with certificate status."""
    
    certificate_status = serializers.ReadOnlyField()
    active_certificate = DeviceCertificateSerializer(read_only=True)
    
    class Meta:
        model = Device
        fields = [
            'id', 'name', 'location', 'protocol', 
            'connection_config', 'is_active', 'created_at',
            'certificate_status', 'active_certificate'
        ]
        read_only_fields = ['id', 'created_at']


class DeviceCreateSerializer(serializers.Serializer):
    """Serializer for device registration requests."""
    
    name = serializers.CharField(max_length=255)
    location = serializers.CharField(max_length=255, required=False, allow_blank=True)
    protocol = serializers.ChoiceField(choices=['mqtt', 'http', 'webhook'], default='mqtt')
    connection_config = serializers.JSONField(required=False, allow_null=True)


class TelemetrySerializer(serializers.ModelSerializer):
    """Serializer for telemetry data."""
    
    device_name = serializers.ReadOnlyField()
    
    class Meta:
        model = Telemetry
        fields = ['time', 'device_id', 'device_name', 'metric', 'value', 'unit']


class DeviceMetricsSerializer(serializers.Serializer):
    """Serializer for device metrics list."""
    
    device_id = serializers.CharField()
    device_name = serializers.CharField()
    metrics = serializers.ListField(child=serializers.CharField())


class DashboardOverviewSerializer(serializers.Serializer):
    """Serializer for dashboard overview data."""
    
    total_devices = serializers.IntegerField()
    active_devices = serializers.IntegerField()
    mqtt_devices = serializers.IntegerField()
    http_devices = serializers.IntegerField()
    certificates_expiring_soon = serializers.IntegerField()
    recent_telemetry = TelemetrySerializer(many=True)
    devices_with_metrics = DeviceMetricsSerializer(many=True)
