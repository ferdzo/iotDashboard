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
from django.urls import path
from iotDashboard import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('devices_api/', views.devices_api),
    path('', views.chart, name="index"),
    path('fetch_device_data/', views.fetch_device_data, name='fetch_device_data'),
    path('devices/', views.device_list, name='device_list'),
    path('devices/add/', views.add_device, name='add_device'),
    path('devices/edit/<int:pk>/', views.edit_device, name='edit_device'),
    path('devices/delete/<int:pk>/', views.delete_device, name='delete_device'),
    path('logout/', views.logout_view, name='logout'),
    path('sensors/<int:device_id>/', views.sensor_list, name='sensor_list'),
    path('sensor/add/', views.add_sensor_with_type, name="add_sensor_with_type"),
    # path('devices/<int:device_id>/sensors/', views.sensor_list, name='sensor_list'),
    path('device/<int:device_id>/add_sensor/', views.add_sensor, name='add_sensor'),
    path('sensor/edit/<int:pk>/', views.edit_sensor, name='edit_sensor'),
    path('sensor/delete/<int:pk>/', views.delete_sensor, name='delete_sensor'),
]
