"""
URL configuration for iotDashboard project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include
from iotDashboard import views

urlpatterns = [
    path("admin/", admin.site.urls),
    
    # REST API
    path("api/", include("iotDashboard.api.urls")),
    
    # Main dashboard
    path("", views.chart, name="index"),
    path("chart/", views.chart, name="chart"),
    
    # Device management
    path("devices/", views.device_list, name="device_list"),
    path("devices/add/", views.add_device, name="add_device"),
    path("devices/<str:device_id>/", views.view_device, name="view_device"),
    path("devices/<str:device_id>/delete/", views.delete_device, name="delete_device"),
    
    # Certificate management (MQTT devices only)
    path("devices/<str:device_id>/certificate/revoke/", views.revoke_certificate, name="revoke_certificate"),
    path("devices/<str:device_id>/certificate/renew/", views.renew_certificate, name="renew_certificate"),
    
    # Telemetry data API
    path("fetch_device_data/", views.fetch_device_data, name="fetch_device_data"),
    path("analyze_data/", views.analyze_data, name="analyze_data"),
    
    # Legacy/utility endpoints
    path("devices_api/", views.devices_api, name="devices_api"),
    path("logout/", views.logout_view, name="logout"),
]
