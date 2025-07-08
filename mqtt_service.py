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

MQTT_PASS=os.getenv("MQTT_PASS")
MQTT_USER=os.getenv("MQTT_USER")
try:
    redis_client = redis.StrictRedis(host=REDIS_HOST, port=6379, db=0)
    print(redis_client)
    redis_client.ping()
    print('Connected!')
except Exception as ex:
    print
    'Error:', ex
    exit('Failed to connect, terminating.')


MQTT_BROKER = os.getenv('MQTT_BROKER', 'localhost')
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
    return {device['topic'].split('/')[0]: device['device_name'] for device in devices}


def publish_to_stream(stream_name, data):
    """Append a message to Redis Stream."""
    try:
        redis_client.xadd(stream_name, data)
        print(f"Published to Redis Stream '{stream_name}': {data}")
    except redis.RedisError as e:
        print(f"Error writing to Redis Stream: {e}")


def on_message(client, userdata, msg):
    """Handle incoming messages from MQTT broker."""
    try:
        topic_parts = msg.topic.split('/')
        device_endpoint = topic_parts[0]
        sensor_type = topic_parts[2]

        sensor_value = float(msg.payload.decode())
        print(f"Received message from {device_endpoint}, sensor {sensor_type}: {sensor_value}")

        device_map = build_device_map()
        device_name = device_map.get(device_endpoint, device_endpoint)

        if device_name not in mqtt_data:
            mqtt_data[device_name] = {
                "time": datetime.utcnow().isoformat(),
                "device": device_name,
                "sensors": {}
            }

        mqtt_data[device_name]["sensors"][sensor_type] = sensor_value
        mqtt_data[device_name]["time"] = datetime.utcnow().isoformat()

        publish_to_stream(device_name, mqtt_data[device_name])
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
    client.username_pw_set(MQTT_USER,MQTT_PASS)
    client.connect(MQTT_BROKER)

    client.loop_start()
    print("MQTT Client Started")

    try:
        while True:
            time.sleep(10)
    except KeyboardInterrupt:
        print("Script interrupted by user")
    finally:
        client.loop_stop()


if __name__ == "__main__":
    start_mqtt_client()
