"""DRF ViewSets for IoT Dashboard API."""

import requests
from datetime import timedelta, datetime
from urllib.parse import urlparse
from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from asgiref.sync import async_to_sync

from iotDashboard.models import Device, DeviceCertificate, Telemetry
from iotDashboard.dashboard_models import DashboardLayout
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
from iotDashboard.run_suitability import (
    RunSuitabilityCalculator,
    WeatherData,
    AirQualityData,
    HealthData,
)
from iotDashboard.health_insights import (
    HealthInsightsCalculator,
    HealthMetrics,
    EnvironmentalContext,
)
from .serializers import (
    DeviceSerializer,
    DeviceCreateSerializer,
    TelemetrySerializer,
    DashboardOverviewSerializer,
    DashboardLayoutSerializer,
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
    
    @action(detail=False, methods=['post'], url_path='analyze', url_name='analyze')
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
                'analysis': result['analysis'],
                'prompt_type': result['prompt_type'],
                'data_points_analyzed': result['data_points_analyzed']
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


class CalendarViewSet(viewsets.ViewSet):
    """ ViewSet for Calendar"""

    @action(detail=False,methods=['get'])
    def fetch(self,request):
        """ Fetch calendar events """
        calendar_url = request.query_params.get('calendar_url')
        if not calendar_url:
            return Response(
                {'error': 'calendar_url parameter is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        parsed = urlparse(calendar_url)
        if parsed.scheme not in ('http', 'https'):
            return Response(
                {'error': 'Only http/https calendar URLs are supported'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Keep timeout small to avoid hanging the API worker
            calendar_response = requests.get(calendar_url, timeout=10)
            calendar_response.raise_for_status()
        except requests.RequestException as exc:
            return Response(
                {
                    'error': 'Failed to fetch calendar feed',
                    'details': str(exc),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        text = calendar_response.text or ''
        if not text.strip():
            return Response(
                {'error': 'Calendar feed returned no data'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({'calendar_data': text})

        
class WellnessViewSet(viewsets.ViewSet):
    """ViewSet for wellness analysis combining health and environmental data."""
    
    @action(detail=False, methods=['get'])
    def run_suitability(self, request):
        """
        Calculate run suitability combining weather, air quality, and health data.
        
        Query params:
            - health_device_id: Device ID for health metrics (required)
            - city: City name for weather/air quality (required)
            - time_of_day: Optional time override (ISO format)
        """
        health_device_id = request.query_params.get('health_device_id')
        city = request.query_params.get('city')
        time_of_day_str = request.query_params.get('time_of_day')
        
        if not health_device_id:
            return Response(
                {'error': 'health_device_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not city:
            return Response(
                {'error': 'city parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get health device
            try:
                health_device = Device.objects.get(id=health_device_id)
            except Device.DoesNotExist:
                return Response(
                    {'error': f'Health device {health_device_id} not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Fetch weather data
            try:
                weather_data = weather_client.get_weather_by_city(city)
            except Exception as e:
                return Response(
                    {'error': f'Failed to fetch weather data: {str(e)}'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )
            
            # Fetch air quality data
            try:
                raw_air_quality = weather_client.get_air_quality(city.lower())
                air_quality_data = weather_client.parse_air_quality_data(raw_air_quality, city.lower())
            except Exception as e:
                return Response(
                    {'error': f'Failed to fetch air quality data: {str(e)}'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )
            
            # Get health metrics from telemetry
            health_metrics = {}
            health_metric_names = {
                'steps': ['steps', 'step_count'],
                'active_calories': ['active_calories', 'calories'],
                'heart_rate': ['heart_rate', 'heart_rate_bpm', 'hr'],
                'resting_heart_rate': ['resting_heart_rate', 'resting_hr'],
            }
            
            for key, possible_names in health_metric_names.items():
                for metric_name in possible_names:
                    latest = (
                        Telemetry.objects
                        .filter(device_id=health_device_id, metric=metric_name)
                        .order_by('-time')
                        .first()
                    )
                    if latest:
                        health_metrics[key] = float(latest.value)
                        break
            
            # Get current time
            if time_of_day_str:
                try:
                    current_time = datetime.fromisoformat(time_of_day_str.replace('Z', '+00:00'))
                except ValueError:
                    current_time = timezone.now()
            else:
                current_time = timezone.now()
            
            # Prepare data for calculator
            weather = WeatherData(
                temperature=weather_data.get('temperature', 20),
                apparent_temperature=weather_data.get('apparent_temperature', 20),
                wind_speed=weather_data.get('wind_speed', 0),
                precipitation=weather_data.get('precipitation', 0),
                rain=weather_data.get('rain', 0),
                weather_code=weather_data.get('weather_code', 0),
                humidity=weather_data.get('humidity', 50),
                cloud_cover=weather_data.get('cloud_cover', 0),
            )
            
            air_quality = AirQualityData(
                pm25=air_quality_data.get('measurements', {}).get('pm25', {}).get('average'),
                pm10=air_quality_data.get('measurements', {}).get('pm10', {}).get('average'),
                status=air_quality_data.get('status', 'Unknown'),
            )
            
            health = HealthData(
                steps_today=health_metrics.get('steps', 0),
                active_calories=health_metrics.get('active_calories', 0),
                heart_rate=health_metrics.get('heart_rate'),
                resting_heart_rate=health_metrics.get('resting_heart_rate'),
                daily_goal_steps=10000,  # Default goal
            )
            
            # Calculate run suitability
            result = RunSuitabilityCalculator.calculate(
                weather=weather,
                air_quality=air_quality,
                health=health,
                current_time=current_time
            )
            
            return Response({
                'status': result.status,
                'overall_score': result.overall_score,
                'scores': {
                    'weather': result.weather_score,
                    'air_quality': result.air_quality_score,
                    'health': result.health_score,
                },
                'primary_reason': result.primary_reason,
                'detailed_insights': result.detailed_insights,
                'time_recommendations': result.time_recommendations,
                'suggestions': result.suggestions,
                'weather_data': {
                    'temperature': weather.temperature,
                    'wind_speed': weather.wind_speed,
                    'precipitation': weather.precipitation,
                    'description': weather_data.get('weather_description'),
                },
                'air_quality_data': {
                    'pm25': air_quality.pm25,
                    'pm10': air_quality.pm10,
                    'status': air_quality.status,
                },
                'health_data': {
                    'steps': health.steps_today,
                    'active_calories': health.active_calories,
                    'heart_rate': health.heart_rate,
                },
            })
        
        except Exception as e:
            return Response(
                {'error': f'Failed to calculate run suitability: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def health_insights(self, request):
        """
        Get contextual health insights with environmental correlations.
        
        Query params:
            - health_device_id: Device ID for health metrics (required)
            - city: City name for weather/air quality context (optional)
        """
        health_device_id = request.query_params.get('health_device_id')
        city = request.query_params.get('city')
        
        if not health_device_id:
            return Response(
                {'error': 'health_device_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get health device
            try:
                health_device = Device.objects.get(id=health_device_id)
            except Device.DoesNotExist:
                return Response(
                    {'error': f'Health device {health_device_id} not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Get health metrics from telemetry
            health_metrics = {}
            health_metric_names = {
                'steps': ['steps', 'step_count'],
                'active_calories': ['active_calories', 'calories'],
                'heart_rate': ['heart_rate', 'heart_rate_bpm', 'hr'],
                'resting_heart_rate': ['resting_heart_rate', 'resting_hr'],
                'sleep_duration': ['sleep_duration', 'sleep'],
            }
            
            for key, possible_names in health_metric_names.items():
                for metric_name in possible_names:
                    latest = (
                        Telemetry.objects
                        .filter(device_id=health_device_id, metric=metric_name)
                        .order_by('-time')
                        .first()
                    )
                    if latest:
                        health_metrics[key] = float(latest.value)
                        break
            
            # Get environmental context (optional)
            env_context = EnvironmentalContext()
            if city:
                try:
                    weather_data = weather_client.get_weather_by_city(city)
                    env_context.temperature = weather_data.get('temperature')
                    env_context.humidity = weather_data.get('humidity')
                    env_context.weather_description = weather_data.get('weather_description')
                except Exception:
                    pass  # Weather optional
                
                try:
                    raw_air_quality = weather_client.get_air_quality(city.lower())
                    air_quality_data = weather_client.parse_air_quality_data(raw_air_quality, city.lower())
                    env_context.pm25 = air_quality_data.get('measurements', {}).get('pm25', {}).get('average')
                    env_context.pm10 = air_quality_data.get('measurements', {}).get('pm10', {}).get('average')
                    env_context.air_quality_status = air_quality_data.get('status')
                except Exception:
                    pass  # Air quality optional
            
            # Prepare health metrics
            health = HealthMetrics(
                steps=int(health_metrics.get('steps', 0)),
                active_calories=int(health_metrics.get('active_calories', 0)),
                heart_rate=health_metrics.get('heart_rate'),
                resting_heart_rate=health_metrics.get('resting_heart_rate'),
                sleep_duration=health_metrics.get('sleep_duration'),
            )
            
            # Calculate insights
            result = HealthInsightsCalculator.calculate(health, env_context)
            
            # Format insights for response
            insights_list = [
                {
                    'metric': insight.metric,
                    'value': insight.value,
                    'context': insight.context,
                    'correlation': insight.correlation,
                    'recommendation': insight.recommendation,
                }
                for insight in result.insights
            ]
            
            return Response({
                'health_metrics': result.health_metrics,
                'environmental_context': result.environmental_context,
                'insights': insights_list,
                'correlations': result.correlations,
                'recommendations': result.recommendations,
                'trend_indicators': result.trend_indicators,
            })
        
        except Exception as e:
            return Response(
                {'error': f'Failed to calculate health insights: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def daily_briefing(self, request):
        """
        Generate a daily briefing combining environment, schedule, and health data.
        
        POST body:
            - briefing_type: 'schedule', 'environment', or 'full' (required)
            - city: City name for weather/air quality (required)
            - health_device_id: Device ID for health metrics (optional)
            - calendar_url: iCal URL for calendar events (optional)
            - calendar_range_hours: Hours to look ahead for events (default 24)
        """
        briefing_type = request.data.get('briefing_type', 'full')
        city = request.data.get('city')
        health_device_id = request.data.get('health_device_id')
        calendar_url = request.data.get('calendar_url')
        calendar_range_hours = int(request.data.get('calendar_range_hours', 24))
        
        if briefing_type not in ('schedule', 'environment', 'full'):
            return Response(
                {'error': 'briefing_type must be schedule, environment, or full'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not city:
            return Response(
                {'error': 'city parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            current_time = timezone.now()
            
            # Gather indoor data from all devices
            indoor_data = {}
            indoor_metrics = ['temperature', 'humidity', 'co2', 'CO2', 'noise', 'light', 'pm25', 'pm2.5']
            
            for metric in indoor_metrics:
                latest = (
                    Telemetry.objects
                    .filter(metric__iexact=metric)
                    .order_by('-time')
                    .first()
                )
                if latest:
                    # Normalize metric names
                    normalized = metric.lower().replace('.', '')
                    if normalized == 'co2':
                        indoor_data['co2_ppm'] = float(latest.value)
                    elif normalized == 'pm25':
                        indoor_data['indoor_pm25'] = float(latest.value)
                    else:
                        indoor_data[f'{normalized}'] = float(latest.value)
            
            # Gather outdoor data (weather + air quality)
            outdoor_data = {}
            try:
                weather = weather_client.get_weather_by_city(city)
                outdoor_data['temperature'] = weather.get('temperature')
                outdoor_data['apparent_temperature'] = weather.get('apparent_temperature')
                outdoor_data['humidity'] = weather.get('humidity')
                outdoor_data['weather'] = weather.get('weather_description')
                outdoor_data['wind_speed'] = weather.get('wind_speed')
            except Exception as e:
                self.logger.warning(f"Failed to fetch weather: {e}") if hasattr(self, 'logger') else None
            
            try:
                raw_aq = weather_client.get_air_quality(city.lower())
                aq = weather_client.parse_air_quality_data(raw_aq, city.lower())
                outdoor_data['pm25'] = aq.get('measurements', {}).get('pm25', {}).get('average')
                outdoor_data['pm10'] = aq.get('measurements', {}).get('pm10', {}).get('average')
                outdoor_data['air_quality_status'] = aq.get('status')
            except Exception as e:
                pass  # Air quality optional
            
            # Gather health data if device specified
            health_data = None
            if health_device_id:
                health_data = {}
                health_metric_names = {
                    'steps': ['steps', 'step_count'],
                    'active_calories': ['active_calories', 'calories'],
                    'heart_rate': ['heart_rate', 'heart_rate_bpm', 'hr'],
                    'resting_heart_rate': ['resting_heart_rate', 'resting_hr'],
                }
                
                for key, possible_names in health_metric_names.items():
                    for metric_name in possible_names:
                        latest = (
                            Telemetry.objects
                            .filter(device_id=health_device_id, metric=metric_name)
                            .order_by('-time')
                            .first()
                        )
                        if latest:
                            health_data[key] = float(latest.value)
                            break
            
            # Parse calendar events if URL provided
            calendar_events = None
            if calendar_url:
                try:
                    cal_response = requests.get(calendar_url, timeout=10)
                    cal_response.raise_for_status()
                    cal_text = cal_response.text
                    
                    # Parse iCal using icalendar library or simple parsing
                    calendar_events = self._parse_ical_events(
                        cal_text, 
                        current_time, 
                        calendar_range_hours
                    )
                except Exception as e:
                    pass  # Calendar optional
            
            # Call GPT service
            result = async_to_sync(gpt_service_client.get_gpt_client().generate_daily_briefing)(
                briefing_type=briefing_type,
                current_time=current_time.isoformat(),
                indoor_data=indoor_data if indoor_data else None,
                outdoor_data=outdoor_data if outdoor_data else None,
                health_data=health_data,
                calendar_events=calendar_events,
            )
            
            # Add context data to response
            result['context'] = {
                'indoor': indoor_data,
                'outdoor': outdoor_data,
                'health': health_data,
                'calendar_event_count': len(calendar_events) if calendar_events else 0,
            }
            
            return Response(result)
        
        except gpt_service_client.GPTServiceError as e:
            return Response(
                {
                    'error': e.message,
                    'details': e.details,
                    'gpt_service_available': False
                },
                status=e.status_code or status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to generate daily briefing: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _parse_ical_events(self, ical_text: str, start_time, range_hours: int):
        """Parse iCal text and extract events within the time range."""
        from datetime import timedelta
        import re
        
        events = []
        end_time = start_time + timedelta(hours=range_hours)
        
        # Simple iCal parsing (handles basic VEVENT blocks)
        vevent_pattern = re.compile(r'BEGIN:VEVENT.*?END:VEVENT', re.DOTALL)
        
        for match in vevent_pattern.finditer(ical_text):
            event_text = match.group()
            event = {}
            
            # Extract summary
            summary_match = re.search(r'SUMMARY[^:]*:(.+?)(?:\r?\n|$)', event_text)
            if summary_match:
                event['summary'] = summary_match.group(1).strip()
            else:
                event['summary'] = 'Untitled'
            
            # Extract start time
            dtstart_match = re.search(r'DTSTART[^:]*:(\d{8}T?\d{0,6}Z?)', event_text)
            if dtstart_match:
                dt_str = dtstart_match.group(1)
                try:
                    if 'T' in dt_str:
                        # DateTime format
                        if dt_str.endswith('Z'):
                            dt = datetime.strptime(dt_str, '%Y%m%dT%H%M%SZ')
                        else:
                            dt = datetime.strptime(dt_str[:15], '%Y%m%dT%H%M%S')
                        event['start'] = dt.strftime('%I:%M %p')
                    else:
                        # Date only (all-day event)
                        dt = datetime.strptime(dt_str, '%Y%m%d')
                        event['start'] = 'All day'
                    
                    # Check if event is within range
                    if dt.replace(tzinfo=None) < start_time.replace(tzinfo=None):
                        continue
                    if dt.replace(tzinfo=None) > end_time.replace(tzinfo=None):
                        continue
                except:
                    event['start'] = 'TBD'
            
            # Extract location
            location_match = re.search(r'LOCATION[^:]*:(.+?)(?:\r?\n|$)', event_text)
            if location_match:
                event['location'] = location_match.group(1).strip()
            
            if event.get('summary'):
                events.append(event)
        
        # Sort by start time and limit
        return events[:15]


# Dashboard Layout Views
class DashboardLayoutViewSet(viewsets.ModelViewSet):
    """ViewSet for managing dashboard layouts (single-user system)."""
    
    serializer_class = DashboardLayoutSerializer
    permission_classes = [permissions.AllowAny]  # No auth required for single-user system
    
    def get_queryset(self):
        """Return all layouts (single-user system)."""
        return DashboardLayout.objects.all()
    
    @action(detail=False, methods=['get'])
    def default(self, request):
        """Get the default layout."""
        layout = DashboardLayout.get_default()
        return Response(self.get_serializer(layout).data)
    
    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        """Set a layout as the default."""
        layout = self.get_object()
        # Unset other defaults
        DashboardLayout.objects.filter(is_default=True).update(is_default=False)
        # Set this one as default
        layout.is_default = True
        layout.save()
        return Response(self.get_serializer(layout).data)


