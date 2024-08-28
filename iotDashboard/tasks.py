import psycopg2
import requests
from huey import crontab
from huey.contrib.djhuey import periodic_task
from datetime import datetime
from django.conf import settings
from .models import Device  # Import your Device model

# Fetch data from the device using REST API
def fetch_data_from_device(device):
    data = dict()
    data["time"] = datetime.now()
    data["device"] = device.name  # Use device name
    r = requests.get(f"http://{device.ip}/sensor/tempreature")
    data["temperature"] = r.json()['value']
    r = requests.get(f"http://{device.ip}/sensor/humidity")
    data["humidity"] = r.json()['value']
    return (data["time"], data["device"], data["temperature"], data["humidity"])

# Insert data into the database
def insert_data(device):
    data = fetch_data_from_device(device)
    with psycopg2.connect(settings.CONNECTION_STRING) as conn:  # Use Django's connection string
        cursor = conn.cursor()
        insert_query = """
            INSERT INTO conditions (time, device, temperature, humidity)
            VALUES (%s, %s, %s, %s)
        """
        cursor.execute(insert_query, data)
        conn.commit()

# Periodic task to fetch data from all devices every minute
@periodic_task(crontab(minute='*/1'))
def fetch_data_from_all_devices():
    devices = Device.objects.all()  # Fetch all devices from the database
    for device in devices:
        insert_data(device)