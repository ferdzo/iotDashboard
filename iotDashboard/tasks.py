import redis
from huey import crontab
from huey.contrib.djhuey import periodic_task
import psycopg2
import datetime
import requests
from django.conf import settings
from .models import Device
import json

redis_client = redis.StrictRedis(host='10.10.0.1', port=6379, db=0)

def devices_to_redis():
    devices = Device.objects.all()

    # Convert devices to a list of dictionaries
    devices_list = []
    for device in devices:
        devices_list.append({
            'id': device.id,
            'name': device.name,
            'protocol': device.protocol,
            'ip': device.ip,
        })

    # Store in Redis
    redis_client.set('devices', json.dumps(devices_list))

devices_to_redis()


def fetch_data_http(device):
    data = {
        "time": datetime.datetime.now(),
        "device": device.name,
    }
    r = requests.get(f"http://{device.ip}/sensor/tempreature")
    data["temperature"] = r.json()['value']
    r = requests.get(f"http://{device.ip}/sensor/humidity")
    data["humidity"] = r.json()['value']
    return data

def fetch_data_mqtt(device):
    data = redis_client.get(device).decode('utf-8')
    data = json.loads(data).get(device)

    if data:
        print(data)
        mqtt_data = data
        # Ensure the data is recent
        if datetime.datetime.fromisoformat(mqtt_data["time"]) > datetime.datetime.now() - datetime.timedelta(minutes=2):
            return mqtt_data
    return None
def insert_data(data):
    with psycopg2.connect(settings.CONNECTION_STRING) as conn:
        cursor = conn.cursor()
        insert_query = """
            INSERT INTO conditions (time, device, temperature, humidity)
            VALUES (%s, %s, %s, %s)
        """
        cursor.execute(insert_query, (data["time"], data["device"], data["temperature"], data["humidity"]))
        conn.commit()

@periodic_task(crontab(minute='*/1'))
def fetch_data_from_all_devices():
    devices = Device.objects.all()
    for device in devices:
        if device.protocol == 'http':
            data = fetch_data_http(device)
            insert_data(data)
        elif device.protocol == 'mqtt':
            # Assume data is already in mqtt_data dictionary
            data = fetch_data_mqtt(device.name)
            print(data)
            if data and datetime.datetime.strptime(data["time"],"%Y-%m-%d %H:%M:%S.%f") > datetime.datetime.now() - datetime.timedelta(minutes=1):
                insert_data(data)
            else:
                print(f"No complete data available for {device.name}. Skipping insertion.")
