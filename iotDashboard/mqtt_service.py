import json
import os
from datetime import datetime
import paho.mqtt.client as mqtt
import redis
import time
from dotenv import load_dotenv

load_dotenv()
# Initialize Redis client
redis_host = os.getenv('REDIS_HOST')
redis_client = redis.StrictRedis(host=redis_host, port=6379, db=0)

# MQTT Broker settings
MQTT_BROKER = os.getenv('MQTT_BROKER')

def get_devices():
    """Fetch devices from Redis."""
    devices_json = redis_client.get('devices')
    if devices_json:
        return json.loads(devices_json)
    return []

def on_message(client, userdata, msg):
    """Callback function to handle MQTT messages."""
    topic_parts = msg.topic.split('/')
    device_name = topic_parts[0]
    sensor_type = topic_parts[-2]

    # Retrieve and decode message payload
    payload = float(msg.payload.decode())

    # Retrieve current device data from Redis or initialize
    device_data_json = redis_client.get(device_name)
    if device_data_json:
        device_data = json.loads(device_data_json)
    else:
        device_data = {
            "time": datetime.now().isoformat(),
            "device": device_name,
            "temperature": None,
            "humidity": None
        }

    # Update device data based on sensor type
    if sensor_type == "temperature":
        device_data["temperature"] = payload
    elif sensor_type == "humidity":
        device_data["humidity"] = payload

    # Update time and save to Redis
    device_data["time"] = datetime.now().isoformat()
    redis_client.set(device_name, json.dumps(device_data))
    print(f"Updated data for {device_name}: {device_data}")

def start_mqtt_client():
    """Initialize and start the MQTT client."""
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1)
    client.on_message = on_message
    client.connect(MQTT_BROKER)

    # Fetch and subscribe to device topics
    devices = get_devices()
    for device in devices:
        client.subscribe(f"{device['name']}/sensor/+/state")

    client.loop_start()
    print("MQTT Client Started")

    try:
        while True:
            time.sleep(10)  # Sleep to prevent high CPU usage
    except KeyboardInterrupt:
        print("Script interrupted by user")
    finally:
        client.loop_stop()  # Stop the loop when exiting

if __name__ == "__main__":
    start_mqtt_client()
