"""DRF ViewSets for IoT Dashboard API."""

from datetime import timedelta
from django.utils import timezone
from django.db.models import Q, Count
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from iotDashboard.models import Device, DeviceCertificate, Telemetry
from iotDashboard.device_manager_client import (
    DeviceManagerClient, 
    DeviceManagerAPIError
)
from .serializers import (
    DeviceSerializer,
    DeviceCreateSerializer,
    DeviceCertificateSerializer,
    TelemetrySerializer,
    DashboardOverviewSerializer,
    DeviceMetricsSerializer,
)


device_manager = DeviceManagerClient()


class DeviceViewSet(viewsets.ModelViewSet):
    """ViewSet for device management."""
    
    queryset = Device.objects.all()
    serializer_class = DeviceSerializer
    # permission_classes = [IsAuthenticated]  # Uncomment for production
    
    def get_serializer_class(self):
        if self.action == 'create':
            return DeviceCreateSerializer
        return DeviceSerializer
    
    def create(self, request):
        """Register a new device via device_manager API."""
        serializer = DeviceCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            response = device_manager.register_device(
                name=serializer.validated_data['name'],
                location=serializer.validated_data.get('location'),
                protocol=serializer.validated_data.get('protocol', 'mqtt'),
                connection_config=serializer.validated_data.get('connection_config'),
            )
            
            # Return full registration response with credentials
            return Response({
                'device_id': response.device_id,
                'protocol': response.protocol,
                'certificate_id': response.certificate_id,
                'ca_certificate_pem': response.ca_certificate_pem,
                'certificate_pem': response.certificate_pem,
                'private_key_pem': response.private_key_pem,
                'expires_at': response.expires_at.isoformat() if response.expires_at else None,
            }, status=status.HTTP_201_CREATED)
        
        except DeviceManagerAPIError as e:
            return Response(
                {'error': e.message, 'details': e.details},
                status=e.status_code or status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def destroy(self, request, pk=None):
        """Delete a device."""
        try:
            device = self.get_object()
            device_name = device.name
            device.delete()
            return Response(
                {'message': f"Device '{device_name}' deleted successfully"},
                status=status.HTTP_204_NO_CONTENT
            )
        except Device.DoesNotExist:
            return Response(
                {'error': 'Device not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def revoke(self, request, pk=None):
        """Revoke a device's certificate."""
        device = self.get_object()
        
        if device.protocol != 'mqtt':
            return Response(
                {'error': 'Only MQTT devices have certificates to revoke'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            result = device_manager.revoke_certificate(device.id)
            return Response(result)
        except DeviceManagerAPIError as e:
            return Response(
                {'error': e.message, 'details': e.details},
                status=e.status_code or status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def renew(self, request, pk=None):
        """Renew a device's certificate."""
        device = self.get_object()
        
        if device.protocol != 'mqtt':
            return Response(
                {'error': 'Only MQTT devices have certificates to renew'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            response = device_manager.renew_certificate(device.id)
            return Response({
                'device_id': response.device_id,
                'protocol': response.protocol,
                'certificate_id': response.certificate_id,
                'ca_certificate_pem': response.ca_certificate_pem,
                'certificate_pem': response.certificate_pem,
                'private_key_pem': response.private_key_pem,
                'expires_at': response.expires_at.isoformat() if response.expires_at else None,
            })
        except DeviceManagerAPIError as e:
            return Response(
                {'error': e.message, 'details': e.details},
                status=e.status_code or status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def telemetry(self, request, pk=None):
        """Get telemetry data for a specific device."""
        device = self.get_object()
        
        # Parse query parameters
        metric = request.query_params.get('metric')
        hours = int(request.query_params.get('hours', 24))
        limit = int(request.query_params.get('limit', 1000))
        
        # Build query
        queryset = Telemetry.objects.filter(
            device_id=device.id,
            time__gte=timezone.now() - timedelta(hours=hours)
        )
        
        if metric:
            queryset = queryset.filter(metric=metric)
        
        queryset = queryset.order_by('-time')[:limit]
        
        serializer = TelemetrySerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def metrics(self, request, pk=None):
        """Get available metrics for a device."""
        device = self.get_object()
        
        metrics = (
            Telemetry.objects
            .filter(device_id=device.id)
            .values_list('metric', flat=True)
            .distinct()
        )
        
        return Response({
            'device_id': device.id,
            'device_name': device.name,
            'metrics': list(metrics)
        })


class TelemetryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for telemetry data queries."""
    
    queryset = Telemetry.objects.all()
    serializer_class = TelemetrySerializer
    # permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter telemetry by query parameters."""
        queryset = Telemetry.objects.all()
        
        # Filter by device
        device_id = self.request.query_params.get('device_id')
        if device_id:
            queryset = queryset.filter(device_id=device_id)
        
        # Filter by metric
        metric = self.request.query_params.get('metric')
        if metric:
            queryset = queryset.filter(metric=metric)
        
        # Filter by time range
        hours = self.request.query_params.get('hours')
        if hours:
            queryset = queryset.filter(
                time__gte=timezone.now() - timedelta(hours=int(hours))
            )
        
        start_time = self.request.query_params.get('start_time')
        if start_time:
            queryset = queryset.filter(time__gte=start_time)
        
        end_time = self.request.query_params.get('end_time')
        if end_time:
            queryset = queryset.filter(time__lte=end_time)
        
        return queryset.order_by('-time')
    
    @action(detail=False, methods=['get'])
    def latest(self, request):
        """Get latest telemetry readings for all devices."""
        from django.db.models import Max
        
        # Get latest timestamp for each device-metric combination
        latest_readings = (
            Telemetry.objects
            .values('device_id', 'metric')
            .annotate(latest_time=Max('time'))
        )
        
        # Fetch the actual records
        telemetry = []
        for reading in latest_readings:
            record = Telemetry.objects.get(
                device_id=reading['device_id'],
                metric=reading['metric'],
                time=reading['latest_time']
            )
            telemetry.append(record)
        
        serializer = self.get_serializer(telemetry, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def metrics(self, request):
        """Get list of all available metrics."""
        metrics = (
            Telemetry.objects
            .values_list('metric', flat=True)
            .distinct()
        )
        return Response({'metrics': list(metrics)})


class DashboardViewSet(viewsets.ViewSet):
    """ViewSet for dashboard overview data."""
    
    # permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def overview(self, request):
        """Get dashboard overview statistics."""
        # Device statistics
        total_devices = Device.objects.count()
        active_devices = Device.objects.filter(is_active=True).count()
        mqtt_devices = Device.objects.filter(protocol='mqtt').count()
        http_devices = Device.objects.filter(protocol__in=['http', 'webhook']).count()
        
        # Certificate statistics
        expiring_soon = DeviceCertificate.objects.filter(
            revoked_at__isnull=True,
            expires_at__lte=timezone.now() + timedelta(days=30),
            expires_at__gt=timezone.now()
        ).count()
        
        # Recent telemetry (last 10 readings)
        recent_telemetry = Telemetry.objects.order_by('-time')[:10]
        
        # Devices with their metrics
        devices = Device.objects.all()
        devices_with_metrics = []
        for device in devices:
            metrics = (
                Telemetry.objects
                .filter(device_id=device.id)
                .values_list('metric', flat=True)
                .distinct()
            )
            devices_with_metrics.append({
                'device_id': device.id,
                'device_name': device.name,
                'metrics': list(metrics)
            })
        
        data = {
            'total_devices': total_devices,
            'active_devices': active_devices,
            'mqtt_devices': mqtt_devices,
            'http_devices': http_devices,
            'certificates_expiring_soon': expiring_soon,
            'recent_telemetry': TelemetrySerializer(recent_telemetry, many=True).data,
            'devices_with_metrics': devices_with_metrics,
        }
        
        serializer = DashboardOverviewSerializer(data)
        return Response(serializer.data)
