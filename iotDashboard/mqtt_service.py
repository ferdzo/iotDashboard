import json
import time
import os
from datetime import datetime
import paho.mqtt.client as mqtt
import redis
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set up Redis client
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
redis_client = redis.StrictRedis(host=REDIS_HOST, port=6379, db=0)
print("Connected to Redis Server")

# MQTT broker address
MQTT_BROKER = os.getenv('MQTT_BROKER')
mqtt_data = {}


def get_mqtt_devices():
    """Retrieve MQTT devices and sensor details from Redis."""
    devices_json = redis_client.get('mqtt_devices')
    if devices_json:
        return json.loads(devices_json)
    return []


def build_device_map():
    """Build a mapping of device endpoints to friendly names."""
    devices = get_mqtt_devices()
    return {device['topic'].split('/')[0]: device['device_name'] for device in
            devices}  # Assuming topic starts with device name


def on_message(client, userdata, msg):
    """Handle incoming messages from MQTT broker."""
    try:
        # Parse the incoming message topic
        topic_parts = msg.topic.split('/')
        device_endpoint = topic_parts[0]  # This is the actual endpoint name
        sensor_type = topic_parts[2]  # Assuming sensor type is in the third part

        sensor_value = float(msg.payload.decode())
        print(f"Received message from {device_endpoint}, sensor {sensor_type}: {sensor_value}")

        # Build the device map to get the friendly device name
        device_map = build_device_map()
        device_name = device_map.get(device_endpoint, device_endpoint)  # Fallback to endpoint if not found

        if device_name not in mqtt_data:
            mqtt_data[device_name] = {
                "time": datetime.utcnow().isoformat(),
                "device": device_name,
                "sensors": {}
            }

        # Update the sensor value in the mqtt_data dictionary
        mqtt_data[device_name]["sensors"][sensor_type] = sensor_value
        mqtt_data[device_name]["time"] = datetime.utcnow().isoformat()

        # Store the updated data structure in Redis
        redis_client.set(device_name, json.dumps(mqtt_data[device_name]))
        print(f"Updated data for {device_name}: {mqtt_data[device_name]}")

    except ValueError as e:
        print(f"Error processing message payload: {e}")


def on_connect(client, userdata, flags, rc):
    """Handle successful MQTT connection."""
    if rc == 0:
        print("Connected to MQTT Broker")
        devices = get_mqtt_devices()
        for device in devices:
            client.subscribe(device['topic'])  # Subscribing to each device's topic
            print(f"Subscribed to topic: {device['topic']}")
    else:
        print(f"Failed to connect, return code {rc}")


def on_disconnect(client, userdata, rc):
    """Handle disconnection from MQTT broker."""
    print(f"Disconnected with result code: {rc}")


def start_mqtt_client():
    """Start the MQTT client to begin listening to topics."""
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_message = on_message
    client.connect(MQTT_BROKER)

    client.loop_start()
    print("MQTT Client Started")

    try:
        while True:
            time.sleep(10)  # Sleep to prevent high CPU usage
    except KeyboardInterrupt:
        print("Script interrupted by user")
    finally:
        client.loop_stop()


if __name__ == "__main__":
    start_mqtt_client()
