"""URL routing for IoT Dashboard REST API."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DeviceViewSet, TelemetryViewSet, DashboardViewSet, WeatherViewSet, 
    WellnessViewSet, DashboardLayoutViewSet, CalendarViewSet
)

router = DefaultRouter()
router.register(r'devices', DeviceViewSet, basename='device')
router.register(r'telemetry', TelemetryViewSet, basename='telemetry')
router.register(r'dashboard', DashboardViewSet, basename='dashboard')
router.register(r'weather', WeatherViewSet, basename='weather')
router.register(r'wellness', WellnessViewSet, basename='wellness')
router.register(r'dashboard-layouts', DashboardLayoutViewSet, basename='dashboard-layout')
router.register(r'calendar', CalendarViewSet, basename='calendar')

urlpatterns = [
    path('', include(router.urls)),
]
