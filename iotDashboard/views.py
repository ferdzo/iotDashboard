import json

from django.core.serializers.json import DjangoJSONEncoder
from django.http import JsonResponse, HttpResponse
from django.db import connections
from django.shortcuts import render, redirect, get_object_or_404
from django.views.decorators.http import require_GET

from .models import Device, Sensor, SensorType
from .forms import DeviceForm, SensorWithTypeForm
import redis

redis_client = redis.StrictRedis(host='10.10.0.1', port=6379, db=0)


def fetch_gpt_data():
    return redis_client.get("gpt").decode("utf-8").strip('b"').replace('\\"', '"').replace("\\n", "").replace("\\", "")


def chart(request):
    # Fetch devices and their related sensors
    devices = list(Device.objects.all().values('name', 'sensors__type__name'))

    # Serialize data to JSON format
    devices_json = json.dumps(devices, cls=DjangoJSONEncoder)

    # Pass devices data to the context
    gpt = fetch_gpt_data()
    gpt = json.loads(gpt)
    context = {'devices_json': devices_json, 'gpt': gpt["summary"]}

    return render(request, 'chart.html', context)

# Fetch sensor data (AJAX)
def fetch_device_data(request):
    device_name = request.GET.get('device', 'Livingroom')
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')

    # Log the parameters to ensure they are correct
    print("Device Name:", device_name)
    print("Start Date:", start_date)
    print("End Date:", end_date)

    # Get the specific device by name
    device = get_object_or_404(Device, name=device_name)

    # Initialize the results dictionary to store sensor data
    results = {}

    # Prepare SQL query and parameters for the specific sensor type
    query = """
        SELECT time, metric, value
        FROM sensor_readings
        WHERE device_name = %s
    """
    params = [device.name]

    # Add time filtering to the query
    if start_date:
        query += " AND time >= %s::timestamptz"
        params.append(start_date)

    if end_date:
        query += " AND time <= %s::timestamptz"
        params.append(end_date)

    # Log the final query and params
    print("Final Query:", query)
    print("Params Before Execution:", params)

    # Fetch data from the database
    with connections["data"].cursor() as cursor:
        cursor.execute(query, params)
        rows = cursor.fetchall()

    # Process the results and group them by sensor type (metric)
    for row in rows:
        time, metric, value = row
        formatted_time = time.strftime('%Y-%m-%d %H:%M:%S')

        if metric not in results:
            results[metric] = {
                'times': [],
                'values': []
            }
        results[metric]['times'].append(formatted_time)
        results[metric]['values'].append(value)

    return JsonResponse(results)

def index(request):
    if request.user.is_authenticated:
        return redirect("/chart/")
    return HttpResponse("NOT AUTHENTICATED!!!")


def device_list(request):
    devices = Device.objects.all()
    return render(request, 'device_list.html', {'devices': devices})


def add_device(request):
    if request.method == 'POST':
        form = DeviceForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('device_list')
    else:
        form = DeviceForm()
    return render(request, 'device_form.html', {'form': form})


def edit_device(request, pk):
    device = get_object_or_404(Device, pk=pk)
    if request.method == 'POST':
        form = DeviceForm(request.POST, instance=device)
        if form.is_valid():
            form.save()
            return redirect('device_list')
    else:
        form = DeviceForm(instance=device)
    return render(request, 'device_form.html', {'form': form})


def delete_device(request, pk):
    device = get_object_or_404(Device, pk=pk)
    if request.method == 'POST':
        device.delete()
        return redirect('device_list')
    return render(request, 'device_confirm_delete.html', {'device': device})

def add_sensor_with_type(request):
    if request.method == 'POST':
        form = SensorWithTypeForm(request.POST)
        if form.is_valid():
            form.save()  # This will save both Sensor and SensorType as needed
            return redirect('device_list')  # Adjust this to your specific URL name
    else:
        form = SensorWithTypeForm()

    context = {'form': form}
    return render(request, 'sensor_form.html', context)

def logout_view(request):
    return redirect("/admin")

def devices_api(request):
    devices = list(Device.objects.all().values('name', 'sensors__type__name'))
    return JsonResponse(devices, safe=False)

