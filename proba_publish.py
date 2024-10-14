import os
from datetime import datetime

import redis
from dotenv import load_dotenv

load_dotenv()

REDIS_HOST = os.getenv('REDIS_HOST')
try:
    redis_client = redis.StrictRedis(host=REDIS_HOST, port=6379, db=0)
except redis.RedisError as e:
    raise e
STREAM_NAME = 'sensor_data_stream'


def publish_to_stream(stream_name, data):
    """Publish a message to the Redis Stream."""
    try:
        redis_client.xadd(stream_name, data)
        print(f"Published to Redis Stream '{stream_name}': {data}")
    except redis.RedisError as e:
        print(f"Error writing to Redis Stream: {e}")


if __name__ == "__main__":
    # Example sensor data to publish
    mqtt_data = {
        "time": datetime.utcnow().isoformat(),
        "device": "Livingroom",
        "metric": "temperature",
        "value": 25.6
    }

    # Publish to the stream
    publish_to_stream(STREAM_NAME, mqtt_data)

