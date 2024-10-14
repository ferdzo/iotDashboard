import redis
import json
from django.db import connections
from django.http import JsonResponse, HttpResponse
from django.shortcuts import render, redirect, get_object_or_404

from .forms import DeviceForm, SensorWithTypeForm
from .models import Device, Sensor

redis_client = redis.StrictRedis(host='10.10.0.1', port=6379, db=0)


def fetch_gpt_data():
    return redis_client.get("gpt").decode("utf-8").strip('b"').replace('\\"', '"').replace("\\n", "").replace("\\","").replace("\\u00b0", "°")

def chart(request):
    # Fetch devices and their related sensors
    devices = Device.objects.prefetch_related('sensors__type').all()  # Prefetch related sensors and their types

    # Create a list of devices and associated sensors
    devices_json = [
        {
            "name": device.name,
            "sensors": [{"id": sensor.id, "type": sensor.type.name} for sensor in device.sensors.all()]
        }
        for device in devices
    ]

    try:
        gpt_data = fetch_gpt_data()
        gpt = json.loads(gpt_data)
    except (redis.RedisError, json.JSONDecodeError) as e:
        gpt = {"summary": "Error fetching data", "recommendations": {}}
        print(f"Error fetching or parsing GPT data: {e}")

    context = {
        'devices_json': json.dumps(devices_json),  # Convert to a JSON string
        'gpt': gpt
    }

    return render(request, 'chart.html', context)

def fetch_device_data(request):
    device_name = request.GET.get('device', 'Livingroom')
    sensor_name = request.GET.get('sensor')  # This will be the actual sensor name
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')

    # Log the parameters to ensure they are correct
    sensor_name = Sensor.objects.get(id=sensor_name).type.name

    print("Device Name:", device_name)
    print("Sensor Name:", sensor_name)  # Log sensor name
    print("Start Date:", start_date)
    print("End Date:", end_date)

    # Get the specific device by name
    device = get_object_or_404(Device, name=device_name)

    # Initialize lists to store times and values
    times = []
    values = []

    # Prepare SQL query and parameters for the device
    query = """
        SELECT time, metric, value
        FROM sensor_readings
        WHERE device_name = %s
    """
    params = [device.name]

    # If a specific sensor is specified, filter by that sensor name (converted to lowercase)
    if sensor_name:
        query += " AND metric = LOWER(%s)"  # Convert to lowercase for comparison
        params.append(sensor_name.lower())  # Convert sensor name to lowercase

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

    # Log the number of rows returned
    print("Number of Rows Returned:", len(rows))

    # Process the results and extract times and values
    for row in rows:
        time, metric, value = row
        formatted_time = time.strftime('%Y-%m-%d %H:%M:%S')

        times.append(formatted_time)
        values.append(value)

    # If no data is found, return empty arrays
    if not times and not values:
        print("No data found for the specified device and sensor.")
        return JsonResponse({'times': [], 'values': []})

    # Return the response in the expected format
    return JsonResponse({'times': times, 'values': values})


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


def sensor_list(request, device_id):
    device = get_object_or_404(Device, id=device_id)
    sensors = device.sensors.all()  # Get sensors for this specific device
    return render(request, 'sensor_list.html', {'device': device, 'sensors': sensors})


def edit_sensor(request, pk):
    sensor = get_object_or_404(Sensor, pk=pk)
    if request.method == 'POST':
        form = SensorWithTypeForm(request.POST, instance=sensor)
        if form.is_valid():
            form.save()
            return redirect('sensor_list', device_id=sensor.device.pk)
    else:
        form = SensorWithTypeForm(instance=sensor)
    return render(request, 'sensor_form.html', {'form': form})


def delete_sensor(request, pk):
    sensor = get_object_or_404(Sensor, pk=pk)
    if request.method == 'POST':
        device_id = sensor.device.pk
        sensor.delete()
        return redirect('sensor_list', device_id=device_id)
    return render(request, 'sensor_confirm_delete.html', {'sensor': sensor})


def add_sensor(request, device_id):
    device = get_object_or_404(Device, pk=device_id)
    if request.method == 'POST':
        form = SensorWithTypeForm(request.POST)
        if form.is_valid():
            sensor = form.save(commit=False)
            sensor.device = device  # Associate the sensor with the device
            sensor.save()
            return redirect('device_list')  # Redirect to device list or appropriate view
    else:
        form = SensorWithTypeForm()

    return render(request, 'sensor_form.html', {'form': form, 'device': device})
