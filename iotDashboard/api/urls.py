"""URL routing for IoT Dashboard REST API."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DeviceViewSet, TelemetryViewSet, DashboardViewSet, WeatherViewSet

router = DefaultRouter()
router.register(r'devices', DeviceViewSet, basename='device')
router.register(r'telemetry', TelemetryViewSet, basename='telemetry')
router.register(r'dashboard', DashboardViewSet, basename='dashboard')
router.register(r'weather', WeatherViewSet, basename='weather')

urlpatterns = [
    path('', include(router.urls)),
]
