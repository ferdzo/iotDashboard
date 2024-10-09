import json
import datetime
import requests
import psycopg2
import redis
from django.conf import settings
from huey import crontab
from huey.contrib.djhuey import periodic_task
from .models import Device, Sensor, SensorType

# Initialize Redis client
redis_client = redis.StrictRedis(host='10.10.0.1', port=6379, db=0)

def devices_to_redis():
    """Fetch devices and their sensors' topics from Django and store them in Redis."""
    devices = Device.objects.all()
    devices_list = []
    for device in devices:
        for sensor in device.sensors.all():
            sensor_data = {
                'device_name': device.name,
                'sensor_name': sensor.type.name,
                'topic': sensor.type.topic  # Assuming the topic is stored in SensorType
            }
            devices_list.append(sensor_data)
    redis_client.set('mqtt_devices', json.dumps(devices_list))
    print("Devices with sensors stored in Redis.")

def fetch_data_http(device, sensor):
    """Fetch data from an HTTP sensor."""
    sensor_type_name = sensor.type.name.lower()
    try:
        # Make the request to the device's HTTP endpoint
        response = requests.get(f"http://{device.ip}/sensor/{sensor_type_name}", timeout=5)
        response.raise_for_status()  # Raise an exception for any non-200 status codes
        sensor_value = response.json().get('value')  # Assuming the JSON response structure
        if sensor_value is not None:
            return {
                "time": datetime.datetime.utcnow().isoformat(),
                "device": device.name,
                "sensor": sensor_type_name,
                "sensor_value": sensor_value
            }
        else:
            print(f"No value returned from {device.name} for {sensor_type_name}")
    except requests.RequestException as e:
        print(f"HTTP request failed for {device.name}: {e}")
    return None

def fetch_data_mqtt(device, sensor):
    """Fetch data from Redis for a specific MQTT device and sensor."""
    # Get the data for the specific device from Redis
    data = redis_client.get(device.name)  # Assumes device.name is the Redis key
    if data:
        data = json.loads(data.decode('utf-8'))

        # Normalize the sensor name to lowercase for lookup
        sensor_name = sensor.type.name.lower()
        sensor_value = data['sensors'].get(sensor_name)

        if sensor_value is not None and is_recent_data(data['time']):
            return {
                "time": data['time'],
                "device": device.name,
                "sensor_value": sensor_value
            }

    print(data)
    return None


def is_recent_data(timestamp):
    """Check if data is within a 2-minute freshness window."""
    data_time = datetime.datetime.fromisoformat(timestamp)
    return data_time > datetime.datetime.utcnow() - datetime.timedelta(minutes=2)

def insert_data(data, sensor_type):
    """Insert parsed data into the PostgreSQL database."""
    if 'sensor_value' not in data:
        print(f"Missing 'sensor_value' in data: {data}. Skipping insertion.")
        return

    insert_data_dict = {
        "time": data['time'],
        "device": data['device'],
        "metric": sensor_type.lower(),
        "value": data['sensor_value'],
    }

    try:
        with psycopg2.connect(settings.CONNECTION_STRING) as conn:
            with conn.cursor() as cursor:
                insert_query = """
                INSERT INTO sensor_readings (time, device_name, metric, value)
                VALUES (%s, %s, %s, %s);
                """
                cursor.execute(insert_query, (
                    insert_data_dict["time"],
                    insert_data_dict["device"],
                    insert_data_dict["metric"],
                    insert_data_dict["value"]
                ))
            conn.commit()
            print(f"Data inserted successfully for {insert_data_dict['device']}: {insert_data_dict}")
    except Exception as e:
        print(f"Failed to insert data: {e}")

@periodi    c_task(crontab(minute='*/1'))
def fetch_data_from_all_devices():
    """Fetch and insert data for all devices based on their protocol."""
    devices = Device.objects.all()
    for device in devices:
        for sensor in device.sensors.all():
            data = None

            if device.protocol == 'http':
                data = fetch_data_http(device, sensor)
            elif device.protocol == 'mqtt':
                data = fetch_data_mqtt(device, sensor)

            if data and is_recent_data(data['time']):
                insert_data(data, sensor.type.name)
            else:
                print(f"No recent or valid data for {device.name}. Skipping.")

@periodic_task(crontab(minute='*/5'))
def last_5_minutes():
    """Fetch the last 5 readings from TimescaleDB and store them in Redis."""
    try:
        with psycopg2.connect(settings.CONNECTION_STRING) as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT time, device_name, metric, value
                    FROM sensor_readings
                    ORDER BY time DESC
                    LIMIT 5;
                """)
                results = cursor.fetchall()

                data = [
                    {
                        "time": reading[0].isoformat(),
                        "device": reading[1],
                        "metric": reading[2],
                        "value": reading[3]
                    }
                    for reading in results
                ]
                redis_client.set("last5", json.dumps(data))
                print("Last 5 readings:", data)
    except Exception as e:
        print(f"Error fetching or storing the last 5 readings: {e}")

# Initialize device data in Redis
devices_to_redis()
