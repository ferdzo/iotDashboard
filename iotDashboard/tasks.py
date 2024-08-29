import json
import datetime
import requests
import psycopg2
from django.conf import settings
from huey import crontab
from huey.contrib.djhuey import periodic_task
from .models import Device
import redis


# Initialize Redis client
redis_client = redis.StrictRedis(host='10.10.0.1', port=6379, db=0)


def devices_to_redis():
    """Fetch all devices from Django and store them in Redis."""
    devices = Device.objects.all()
    devices_list = [
        {
            'id': device.id,
            'name': device.name,
            'protocol': device.protocol,
            'ip': device.ip,
        }
        for device in devices
    ]
    redis_client.set('devices', json.dumps(devices_list))


def fetch_data_http(device):
    """Fetch temperature and humidity data from an HTTP sensor."""
    data = {
        "time": datetime.datetime.now().isoformat(),
        "device": device.name,
    }
    try:
        temperature_response = requests.get(f"http://{device.ip}/sensor/tempreature")
        humidity_response = requests.get(f"http://{device.ip}/sensor/humidity")
        data["temperature"] = temperature_response.json().get('value')
        data["humidity"] = humidity_response.json().get('value')
    except requests.RequestException as e:
        print(f"HTTP request failed: {e}")
    return data


def fetch_data_mqtt(device_name):
    """Fetch data from Redis for a specific MQTT device."""
    data = redis_client.get(device_name)
    if data:
        data = json.loads(data.decode('utf-8')).get(device_name)
        if data and datetime.datetime.fromisoformat(data["time"]) > datetime.datetime.now() - datetime.timedelta(
                minutes=2):
            return data
    return None


def insert_data(data):
    """Insert data into the PostgreSQL database."""
    with psycopg2.connect(settings.CONNECTION_STRING) as conn:
        with conn.cursor() as cursor:
            insert_query = """
                INSERT INTO conditions (time, device, temperature, humidity)
                VALUES (%s, %s, %s, %s)
            """
            cursor.execute(insert_query, (data["time"], data["device"], data["temperature"], data["humidity"]))
            conn.commit()


@periodic_task(crontab(minute='*/1'))
def fetch_data_from_all_devices():
    """Fetch and insert data for all devices based on their protocol."""
    devices = Device.objects.all()
    for device in devices:
        data = None
        if device.protocol == 'http':
            data = fetch_data_http(device)
        elif device.protocol == 'mqtt':
            data = fetch_data_mqtt(device.name)

        if data:
            data_time = datetime.datetime.fromisoformat(data["time"])
            if data_time > datetime.datetime.now() - datetime.timedelta(minutes=1):
                insert_data(data)
            else:
                print(f"No recent data available for {device.name}. Skipping insertion.")
        else:
            print(f"No data available for {device.name}. Skipping insertion.")


# Initialize device data in Redis
devices_to_redis()
