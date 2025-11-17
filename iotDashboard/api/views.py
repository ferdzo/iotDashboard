"""DRF ViewSets for IoT Dashboard API."""

import requests
from datetime import timedelta
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from asgiref.sync import async_to_sync

from iotDashboard.models import Device, DeviceCertificate, Telemetry
from iotDashboard.device_manager_client import (
    DeviceManagerClient, 
    DeviceManagerAPIError
)
from iotDashboard import gpt_service_client
from iotDashboard import weather_client
from iotDashboard.comfort_index import (
    ComfortMetrics,
    ComfortIndexCalculator,
    calculate_comfort_index_from_telemetry,
)
from .serializers import (
    DeviceSerializer,
    DeviceCreateSerializer,
    TelemetrySerializer,
    DashboardOverviewSerializer,
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
                'onboarding_token': response.onboarding_token,  # One-time token for QR code
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
    def credentials(self, request, pk=None):
        """
        Fetch device credentials using one-time onboarding token.
        Used by mobile apps after scanning QR code.
        
        Query params:
            - token: One-time onboarding token from QR code
        """
        device_id = pk
        token = request.query_params.get('token')
        
        if not token:
            return Response(
                {'error': 'token parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            response = device_manager.get_device_credentials(device_id, token)
            
            # Return credentials
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
    
    @action(detail=True, methods=['get'])
    def comfort_index(self, request, pk=None):
        """
        Calculate comfort index from latest telemetry data.
        
        Returns overall comfort score (0-100) and component breakdowns.
        """
        device = self.get_object()
        
        # Get latest reading for each metric
        latest_readings = {}
        metrics_to_check = ['temperature', 'humidity', 'co2', 'CO2', 'noise', 'sound', 
                           'pm2.5', 'PM2.5', 'pm10', 'PM10', 'light', 'lux']
        
        for metric in metrics_to_check:
            reading = (
                Telemetry.objects
                .filter(device_id=device.id, metric=metric)
                .order_by('-time')
                .first()
            )
            if reading:
                latest_readings[metric] = reading.value
        
        if not latest_readings:
            return Response(
                {'error': 'No telemetry data available for comfort calculation'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Calculate comfort index
        comfort_metrics = ComfortMetrics(
            temperature=latest_readings.get('temperature'),
            humidity=latest_readings.get('humidity'),
            co2=latest_readings.get('co2') or latest_readings.get('CO2'),
            noise=latest_readings.get('noise') or latest_readings.get('sound'),
            pm25=latest_readings.get('pm2.5') or latest_readings.get('PM2.5'),
            pm10=latest_readings.get('pm10') or latest_readings.get('PM10'),
            light=latest_readings.get('light') or latest_readings.get('lux'),
        )
        
        comfort_score = ComfortIndexCalculator.calculate(comfort_metrics)
        
        return Response({
            'device_id': device.id,
            'device_name': device.name,
            'overall_score': comfort_score.overall_score,
            'rating': comfort_score.rating,
            'components': {
                'temperature': comfort_score.temperature_score,
                'humidity': comfort_score.humidity_score,
                'air_quality': comfort_score.air_quality_score,
                'acoustic': comfort_score.acoustic_score,
                'light': comfort_score.light_score,
            },
            'suggestions': comfort_score.suggestions,
            'raw_readings': latest_readings,
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
    
    @action(detail=False, methods=['post'])
    def analyze(self, request):
        """Analyze telemetry data using GPT service."""
        # Parse request parameters
        device_id = request.data.get('device_id')
        metric = request.data.get('metric')
        hours = int(request.data.get('hours', 24))
        limit = int(request.data.get('limit', 100))
        prompt_type = request.data.get('prompt_type', 'trend_summary')
        custom_prompt = request.data.get('custom_prompt')
        
        # Validate device_id
        if not device_id:
            return Response(
                {'error': 'device_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            device = Device.objects.get(id=device_id)
        except Device.DoesNotExist:
            return Response(
                {'error': f'Device {device_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Query telemetry data
        queryset = Telemetry.objects.filter(
            device_id=device_id,
            time__gte=timezone.now() - timedelta(hours=hours)
        )
        
        if metric:
            queryset = queryset.filter(metric=metric)
        
        telemetry = queryset.order_by('-time')[:limit]
        
        if not telemetry:
            return Response(
                {'error': 'No telemetry data found for specified parameters'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Format data for GPT service
        telemetry_data = [
            {
                'device_id': str(t.device_id),
                'metric': t.metric,
                'value': float(t.value),
                'timestamp': t.time.isoformat()
            }
            for t in telemetry
        ]
        
        # Device context
        device_info = {
            'name': device.name,
            'location': device.location,
            'protocol': device.protocol,
        }
        
        # Call GPT service
        try:
            result = async_to_sync(gpt_service_client.analyze_telemetry)(
                telemetry_data=telemetry_data,
                device_info=device_info,
                prompt_type=prompt_type,
                custom_prompt=custom_prompt
            )
            return Response({
                'analysis': result.analysis,
                'prompt_type': result.prompt_type,
                'data_points_analyzed': result.data_points_analyzed
            })
        
        except gpt_service_client.GPTServiceError as e:
            return Response(
                {
                    'error': e.message,
                    'details': e.details,
                    'gpt_service_available': False
                },
                status=e.status_code or status.HTTP_503_SERVICE_UNAVAILABLE
            )


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


class WeatherViewSet(viewsets.ViewSet):
    """ViewSet for weather and air quality data."""
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """
        Get current weather data by city name or coordinates.
        
        Query params:
            - city: City name (e.g., "Skopje")
            OR
            - lat: Latitude
            - lon: Longitude
        """
        city = request.query_params.get('city')
        lat = request.query_params.get('lat')
        lon = request.query_params.get('lon')
        
        try:
            if city:
                # Fetch by city name
                weather_data = weather_client.get_weather_by_city(city)
            elif lat and lon:
                # Fetch by coordinates
                latitude = float(lat)
                longitude = float(lon)
                raw_weather = weather_client.fetch_current_weather(latitude, longitude)
                weather_data = weather_client.parse_weather_data(raw_weather)
            else:
                return Response(
                    {'error': 'Either city or (lat, lon) parameters are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            return Response(weather_data)
        
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_404_NOT_FOUND
            )
        except requests.RequestException as e:
            return Response(
                {'error': 'Failed to fetch weather data', 'details': str(e)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
    
    @action(detail=False, methods=['get'])
    def air_quality(self, request):
        """
        Get current air quality data for a city (Pulse.eco API).
        
        Query params:
            - city: City name (e.g., "skopje", "bitola", "tetovo")
        """
        city = request.query_params.get('city')
        
        if not city:
            return Response(
                {'error': 'city parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            raw_data = weather_client.get_air_quality(city)
            parsed_data = weather_client.parse_air_quality_data(raw_data, city)
            return Response(parsed_data)
        
        except requests.HTTPError as e:
            if e.response.status_code == 404:
                return Response(
                    {'error': f'City "{city}" not found or not supported by Pulse.eco'},
                    status=status.HTTP_404_NOT_FOUND
                )
            return Response(
                {'error': 'Failed to fetch air quality data', 'details': str(e)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except requests.RequestException as e:
            return Response(
                {'error': 'Failed to fetch air quality data', 'details': str(e)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

