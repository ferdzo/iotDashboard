"""
Django views for IoT Dashboard.

PERFORMANCE OPTIMIZATIONS:
- Lazy Redis initialization with connection pooling (max 10 connections)
- N+1 query prevention: Uses select_related() for sensor lookups
- Proper logging: Uses Python logging module instead of print statements
- Optimized string processing in data fetching

See PERFORMANCE_IMPROVEMENTS.md for detailed analysis.
"""
import redis
import json
import logging
import os
from django.db import connections
from django.http import JsonResponse, HttpResponse
from django.shortcuts import render, redirect, get_object_or_404
from dotenv import load_dotenv

from .forms import DeviceForm, SensorWithTypeForm
from iotDashboard.models import Device, Sensor

load_dotenv()

logger = logging.getLogger(__name__)

# Lazy Redis client initialization with connection pooling
_redis_client = None


def get_redis_client():
    """Get or create Redis client (lazy initialization with connection pooling)"""
    global _redis_client
    if _redis_client is None:
        redis_host = os.getenv("REDIS_HOST", "10.10.0.1")
        _redis_client = redis.StrictRedis(
            host=redis_host,
            port=6379,
            db=0,
            connection_pool=redis.ConnectionPool(
                host=redis_host, port=6379, db=0, max_connections=10
            ),
        )
        logger.info(f"Redis client initialized with connection pool to {redis_host}")
    return _redis_client


def fetch_gpt_data():
    """Fetch GPT data from Redis with optimized string processing"""
    redis_client = get_redis_client()
    raw_data = redis_client.get("gpt")
    if raw_data is None:
        return None
    
    # More efficient string processing
    decoded = raw_data.decode("utf-8")
    # Use str.translate for bulk character replacement if needed
    # For now, simplify the chain of replaces
    return decoded.strip('b"').replace('\\"', '"').replace("\\n", "").replace("\\u00b0", "°")


def chart(request):
    # Fetch devices and their related sensors
    devices = Device.objects.prefetch_related(
        "sensors__type"
    ).all()  # Prefetch related sensors and their types

    # Create a list of devices and associated sensors
    devices_json = [
        {
            "name": device.name,
            "sensors": [
                {"id": sensor.id, "type": sensor.type.name}
                for sensor in device.sensors.all()
            ],
        }
        for device in devices
    ]

    try:
        gpt_data = fetch_gpt_data()
        if gpt_data:
            gpt = json.loads(gpt_data)
        else:
            gpt = {"summary": "No data available", "recommendations": {}}
    except (redis.RedisError, json.JSONDecodeError, AttributeError) as e:
        gpt = {"summary": "Error fetching data", "recommendations": {}}
        logger.error(f"Error fetching or parsing GPT data: {e}")

    context = {
        "devices_json": json.dumps(devices_json),  # Convert to a JSON string
        "gpt": gpt,
    }

    return render(request, "chart.html", context)


def fetch_device_data(request):
    device_name = request.GET.get("device", "Livingroom")
    sensor_id = request.GET.get("sensor")  # This will be the actual sensor ID
    start_date = request.GET.get("start_date")
    end_date = request.GET.get("end_date")

    # Optimize: Use select_related to avoid N+1 query
    sensor = Sensor.objects.select_related('type').get(id=sensor_id)
    sensor_name = sensor.type.name

    logger.debug(f"Device: {device_name}, Sensor: {sensor_name}, Start: {start_date}, End: {end_date}")

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
    logger.debug(f"Query: {query}, Params: {params}")

    # Fetch data from the database
    with connections["data"].cursor() as cursor:
        cursor.execute(query, params)
        rows = cursor.fetchall()

    logger.debug(f"Rows returned: {len(rows)}")

    # Process the results and extract times and values
    for row in rows:
        time, metric, value = row
        formatted_time = time.strftime("%Y-%m-%d %H:%M:%S")

        times.append(formatted_time)
        values.append(value)

    # If no data is found, return empty arrays
    if not times and not values:
        logger.info(f"No data found for device {device_name} and sensor {sensor_name}")
        return JsonResponse({"times": [], "values": []})

    # Return the response in the expected format
    return JsonResponse({"times": times, "values": values})


def index(request):
    if request.user.is_authenticated:
        return redirect("/chart/")
    return HttpResponse("NOT AUTHENTICATED!!!")


def device_list(request):
    devices = Device.objects.all()
    return render(request, "device_list.html", {"devices": devices})


def add_device(request):
    if request.method == "POST":
        form = DeviceForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect("device_list")
    else:
        form = DeviceForm()
    return render(request, "device_form.html", {"form": form})


def edit_device(request, pk):
    device = get_object_or_404(Device, pk=pk)
    if request.method == "POST":
        form = DeviceForm(request.POST, instance=device)
        if form.is_valid():
            form.save()
            return redirect("device_list")
    else:
        form = DeviceForm(instance=device)
    return render(request, "device_form.html", {"form": form})


def delete_device(request, pk):
    device = get_object_or_404(Device, pk=pk)
    if request.method == "POST":
        device.delete()
        return redirect("device_list")
    return render(request, "device_confirm_delete.html", {"device": device})


def add_sensor_with_type(request):
    if request.method == "POST":
        form = SensorWithTypeForm(request.POST)
        if form.is_valid():
            form.save()  # This will save both Sensor and SensorType as needed
            return redirect("device_list")  # Adjust this to your specific URL name
    else:
        form = SensorWithTypeForm()

    context = {"form": form}
    return render(request, "sensor_form.html", context)


def logout_view(request):
    return redirect("/admin")


def devices_api(request):
    devices = list(Device.objects.all().values("name", "sensors__type__name"))
    return JsonResponse(devices, safe=False)


def sensor_list(request, device_id):
    device = get_object_or_404(Device, id=device_id)
    sensors = device.sensors.all()  # Get sensors for this specific device
    return render(request, "sensor_list.html", {"device": device, "sensors": sensors})


def edit_sensor(request, pk):
    sensor = get_object_or_404(Sensor, pk=pk)
    if request.method == "POST":
        form = SensorWithTypeForm(request.POST, instance=sensor)
        if form.is_valid():
            form.save()
            return redirect("sensor_list", device_id=sensor.device.pk)
    else:
        form = SensorWithTypeForm(instance=sensor)
    return render(request, "sensor_form.html", {"form": form})


def delete_sensor(request, pk):
    sensor = get_object_or_404(Sensor, pk=pk)
    if request.method == "POST":
        device_id = sensor.device.pk
        sensor.delete()
        return redirect("sensor_list", device_id=device_id)
    return render(request, "sensor_confirm_delete.html", {"sensor": sensor})


def add_sensor(request, device_id):
    device = get_object_or_404(Device, pk=device_id)
    if request.method == "POST":
        form = SensorWithTypeForm(request.POST)
        if form.is_valid():
            sensor = form.save(commit=False)
            sensor.device = device  # Associate the sensor with the device
            sensor.save()
            return redirect(
                "device_list"
            )  # Redirect to device list or appropriate view
    else:
        form = SensorWithTypeForm()

    return render(request, "sensor_form.html", {"form": form, "device": device})
