import json
from django.http import JsonResponse
from django.shortcuts import render, redirect
from django.contrib import messages

from iotDashboard.models import Device, Telemetry
from iotDashboard.device_manager_client import DeviceManagerClient, DeviceManagerAPIError

device_manager = DeviceManagerClient()

def chart(request):
    """Main dashboard showing telemetry charts."""
    try:
        devices = Device.objects.all()
        
        devices_data = []
        for device in devices:
            # Get unique metrics for this device from telemetry
            metrics = (
                Telemetry.objects
                .filter(device_id=device.id)
                .values_list('metric', flat=True)
                .distinct()
            )
            
            devices_data.append({
                "id": device.id,
                "name": device.name,
                "protocol": device.protocol,
                "metrics": list(metrics),
            })
        
        context = {
            "devices_json": json.dumps(devices_data),
        }
        
        return render(request, "chart.html", context)
    
    except Exception as e:
        messages.error(request, f"Error loading dashboard: {str(e)}")
        return render(request, "chart.html", {"devices_json": "[]"})


def fetch_device_data(request):
    """Fetch telemetry data for chart visualization."""
    from datetime import datetime, timedelta
    from django.utils import timezone
    
    device_id = request.GET.get("device_id")
    metric = request.GET.get("metric")
    start_date = request.GET.get("start_date")
    end_date = request.GET.get("end_date")

    if not device_id:
        return JsonResponse({"error": "device_id is required"}, status=400)

    try:
        # Build query using Django ORM
        queryset = Telemetry.objects.filter(device_id=device_id)
        
        # Filter by metric if provided
        if metric:
            queryset = queryset.filter(metric=metric)
        
        # Parse and filter by date range (default to last 24 hours)
        if start_date:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            queryset = queryset.filter(time__gte=start_dt)
        else:
            # Default: last 24 hours
            queryset = queryset.filter(time__gte=timezone.now() - timedelta(hours=24))
        
        if end_date:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            queryset = queryset.filter(time__lte=end_dt)
        
        # Order by time and get values
        results = queryset.order_by('time').values_list('time', 'value')
        
        times = []
        values = []
        for time, value in results:
            times.append(time.strftime("%Y-%m-%d %H:%M:%S"))
            values.append(float(value))
        
        return JsonResponse({"times": times, "values": values})
    
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


def device_list(request):
    """List all devices with their certificate status."""
    try:
        devices = Device.objects.all()
        
        # Enrich devices with certificate information
        devices_with_certs = []
        for device in devices:
            device_data = {
                "device": device,
                "certificate_status": device.certificate_status if device.protocol == "mqtt" else "N/A",
                "active_certificate": device.active_certificate if device.protocol == "mqtt" else None,
            }
            devices_with_certs.append(device_data)
        
        return render(request, "device_list.html", {"devices": devices_with_certs})
    
    except Exception as e:
        messages.error(request, f"Error loading devices: {str(e)}")
        return render(request, "device_list.html", {"devices": []})


def add_device(request):
    """Register a new device via device_manager API."""
    if request.method == "POST":
        name = request.POST.get("name")
        location = request.POST.get("location")
        protocol = request.POST.get("protocol", "mqtt")
        
        if not name:
            messages.error(request, "Device name is required")
            return render(request, "device_form.html")
        
        try:
            response = device_manager.register_device(
                name=name,
                location=location,
                protocol=protocol
            )
            
            # Show credentials page (one-time view)
            return render(request, "device_credentials.html", {
                "device_name": name,
                "response": response,
            })
        
        except DeviceManagerAPIError as e:
            messages.error(request, f"Failed to register device: {e.message}")
            return render(request, "device_form.html", {
                "name": name,
                "location": location,
                "protocol": protocol,
            })
    
    return render(request, "device_form.html")


def view_device(request, device_id):
    """View device details and certificate information."""
    try:
        device = Device.objects.get(id=device_id)
        
        # Get certificate if MQTT device
        certificate = None
        if device.protocol == "mqtt":
            certificate = device.active_certificate
        
        context = {
            "device": device,
            "certificate": certificate,
        }
        
        return render(request, "device_detail.html", context)
    
    except Device.DoesNotExist:
        messages.error(request, f"Device {device_id} not found")
        return redirect("device_list")
    except Exception as e:
        messages.error(request, f"Error loading device: {str(e)}")
        return redirect("device_list")


def delete_device(request, device_id):
    """Delete a device."""
    try:
        device = Device.objects.get(id=device_id)
        
        if request.method == "POST":
            device_name = device.name
            device.delete()
            messages.success(request, f"Device '{device_name}' deleted successfully")
            return redirect("device_list")
        
        return render(request, "device_confirm_delete.html", {"device": device})
    
    except Device.DoesNotExist:
        messages.error(request, f"Device {device_id} not found")
        return redirect("device_list")


def revoke_certificate(request, device_id):
    """Revoke a device's certificate via device_manager API."""
    try:
        device = Device.objects.get(id=device_id)
        
        if device.protocol != "mqtt":
            messages.error(request, "Only MQTT devices have certificates to revoke")
            return redirect("device_list")
        
        if request.method == "POST":
            try:
                device_manager.revoke_certificate(device_id)
                messages.success(request, f"Certificate for device '{device.name}' revoked successfully")
            except DeviceManagerAPIError as e:
                messages.error(request, f"Failed to revoke certificate: {e.message}")
            
            return redirect("device_list")
        
        return render(request, "certificate_revoke_confirm.html", {"device": device})
    
    except Device.DoesNotExist:
        messages.error(request, f"Device {device_id} not found")
        return redirect("device_list")


def renew_certificate(request, device_id):
    """Renew a device's certificate via device_manager API."""
    try:
        device = Device.objects.get(id=device_id)
        
        if device.protocol != "mqtt":
            messages.error(request, "Only MQTT devices have certificates to renew")
            return redirect("device_list")
        
        if request.method == "POST":
            try:
                response = device_manager.renew_certificate(device_id)
                
                # Show the new credentials (one-time view)
                return render(request, "device_credentials.html", {
                    "device_name": device.name,
                    "response": response,
                    "is_renewal": True,
                })
            except DeviceManagerAPIError as e:
                messages.error(request, f"Failed to renew certificate: {e.message}")
                return redirect("device_list")
        
        return render(request, "certificate_renew_confirm.html", {"device": device})
    
    except Device.DoesNotExist:
        messages.error(request, f"Device {device_id} not found")
        return redirect("device_list")


def logout_view(request):
    """Redirect to admin logout."""
    return redirect("/admin")


def devices_api(request):
    """JSON API endpoint for devices."""
    devices = list(Device.objects.all().values("id", "name", "protocol", "location"))
    return JsonResponse(devices, safe=False)

def analyze_data(request):
    """Calling the GPT Service to analyze the data."""
    from asgiref.sync import async_to_sync
    from iotDashboard import gpt_service_client
    from datetime import timedelta
    from django.utils import timezone
    
    if request.method != "POST":
        return JsonResponse({"error": "POST method required"}, status=405)
    
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    
    # Parse parameters
    device_id = data.get('device_id')
    metric = data.get('metric')
    hours = int(data.get('hours', 24))
    limit = int(data.get('limit', 100))
    prompt_type = data.get('prompt_type', 'trend_summary')
    custom_prompt = data.get('custom_prompt')
    
    # Validate device_id
    if not device_id:
        return JsonResponse({"error": "device_id is required"}, status=400)
    
    try:
        device = Device.objects.get(id=device_id)
    except Device.DoesNotExist:
        return JsonResponse({"error": f"Device {device_id} not found"}, status=404)
    
    # Query telemetry data
    queryset = Telemetry.objects.filter(
        device_id=device_id,
        time__gte=timezone.now() - timedelta(hours=hours)
    )
    
    if metric:
        queryset = queryset.filter(metric=metric)
    
    telemetry = queryset.order_by('-time')[:limit]
    
    if not telemetry:
        return JsonResponse(
            {"error": "No telemetry data found for specified parameters"},
            status=404
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
        return JsonResponse({
            'analysis': result.analysis,
            'prompt_type': result.prompt_type,
            'data_points_analyzed': result.data_points_analyzed
        })
    
    except gpt_service_client.GPTServiceError as e:
        return JsonResponse(
            {
                'error': e.message,
                'details': e.details,
                'gpt_service_available': False
            },
            status=e.status_code or 503
        )
    
