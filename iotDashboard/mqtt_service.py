import json
import time
import os
from datetime import datetime
import paho.mqtt.client as mqtt
import redis
from dotenv import load_dotenv

load_dotenv()

REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
redis_client = redis.StrictRedis(host=REDIS_HOST, port=6379, db=0)

print("Connected to Redis Server")

MQTT_BROKER = os.getenv('MQTT_BROKER')

mqtt_data = {}


def get_devices():
    """" Simple method to get all devices """
    # Get devices from Redis
    devices_json = redis_client.get('devices')
    if devices_json:
        return json.loads(devices_json)
    return []


def on_message(client, userdata, msg):
    """" Simple method to handle messages """
    topic = msg.topic.split('/')
    device_name = topic[0]
    sensor = topic[-2]

    if device_name not in mqtt_data:
        mqtt_data[device_name] = {"time": datetime.now(),
                                  "device": device_name,
                                  "temperature": None,
                                  "humidity": None}

    if sensor == "tempreature":
        mqtt_data[device_name]["temperature"] = float(msg.payload.decode())
    elif sensor == "humidity":
        mqtt_data[device_name]["humidity"] = float(msg.payload.decode())

    mqtt_data[device_name]["time"] = str(datetime.now())
    redis_client.set(device_name, json.dumps(mqtt_data))
    print(f"Updated data for {device_name}: {mqtt_data[device_name]}")

def on_connect(client, userdata, flags, rc):
    """Handle successful connection."""
    print(f"Connected with result code {rc}")
    devices = get_devices()
    for device in devices:
        client.subscribe(f"{device['name']}/sensor/+/state")

def on_disconnect(client, userdata, rc):
    """Handle disconnection."""
    if rc != 0:
        print(f"Unexpected disconnection. Result code: {rc}")

def start_mqtt_client():
    """ Start the MQTT client """
    devices = get_devices()

    client = mqtt.Client()
    client.on_message = on_message
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.connect(MQTT_BROKER)
    client.loop_start()
    print("MQTT Client Started")
    for device in devices:
        client.subscribe(f"{device['name']}/sensor/+/state")

    # Keep the script running
    try:
        while True:
            time.sleep(10)  # Sleep to prevent high CPU usage
    except KeyboardInterrupt:
        print("Script interrupted by user")
    finally:
        client.loop_stop()  # Stop the loop when exiting


if __name__ == "__main__":
    start_mqtt_client()