import json
import datetime
import os
import requests
import psycopg2
import redis
import logging
from django.conf import settings
from huey import crontab
from huey.contrib.djhuey import periodic_task
from .models import Device
from dotenv import load_dotenv
from psycopg2 import pool

load_dotenv()

logger = logging.getLogger(__name__)

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")  # Default to localhost if not set

# Lazy initialization - no connections at import time
_redis_client = None
_db_connection_pool = None
_http_session = None


def get_redis_client():
    """Get or create Redis client (lazy initialization)"""
    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = redis.StrictRedis(host=REDIS_HOST, port=6379, db=0)
            _redis_client.ping()
            logger.info("Redis connection established")
        except Exception as ex:
            logger.error(f"Failed to connect to Redis: {ex}")
            raise
    return _redis_client


def get_db_connection():
    """Get database connection from pool"""
    global _db_connection_pool
    if _db_connection_pool is None:
        try:
            _db_connection_pool = psycopg2.pool.SimpleConnectionPool(
                1, 5, settings.CONNECTION_STRING
            )
            logger.info("Database connection pool created")
        except Exception as ex:
            logger.error(f"Failed to create database connection pool: {ex}")
            raise
    return _db_connection_pool.getconn()


def return_db_connection(conn):
    """Return connection to pool"""
    global _db_connection_pool
    if _db_connection_pool:
        _db_connection_pool.putconn(conn)


def get_http_session():
    """Get or create HTTP session with connection pooling"""
    global _http_session
    if _http_session is None:
        _http_session = requests.Session()
        # Configure connection pooling
        adapter = requests.adapters.HTTPAdapter(pool_connections=10, pool_maxsize=20)
        _http_session.mount("http://", adapter)
        _http_session.mount("https://", adapter)
        logger.info("HTTP session created with connection pooling")
    return _http_session


def devices_to_redis():
    """Fetch devices and their sensors' topics from Django and store them in Redis."""
    # Use prefetch_related to avoid N+1 queries
    devices = Device.objects.prefetch_related('sensors__type').all()
    devices_list = []
    for device in devices:
        for sensor in device.sensors.all():
            sensor_data = {
                "device_name": device.name,
                "sensor_name": sensor.type.name,
                "topic": sensor.type.topic,  # Assuming the topic is stored in SensorType
            }
            devices_list.append(sensor_data)
    redis_client = get_redis_client()
    redis_client.set("mqtt_devices", json.dumps(devices_list))
    logger.info(f"Devices with sensors stored in Redis: {len(devices_list)} entries")


def fetch_data_http(device, sensor):
    """Fetch data from an HTTP sensor."""
    sensor_type_name = sensor.type.name.lower()
    try:
        session = get_http_session()
        response = session.get(
            f"http://{device.ip}/sensor/{sensor_type_name}", timeout=5
        )
        response.raise_for_status()
        sensor_value = response.json().get("value")
        if sensor_value is not None:
            return {
                "time": datetime.datetime.utcnow().isoformat(),
                "device": device.name,
                "sensor": sensor_type_name,
                "sensor_value": sensor_value,
            }
        else:
            logger.warning(f"No value returned from {device.name} for {sensor_type_name}")
    except requests.RequestException as e:
        logger.error(f"HTTP request failed for {device.name}: {e}")
    return None


def fetch_data_mqtt_stream(device, sensor):
    """Fetch data from Redis Stream for a specific MQTT device and sensor."""
    sensor_name = sensor.type.name.lower()
    stream_key = f"mqtt_stream:{device.name}:{sensor_name}"
    redis_client = get_redis_client()
    try:
        stream_data = redis_client.xread({stream_key: "0-0"}, block=1000, count=1)
        if stream_data:
            _, entries = stream_data[0]
            for entry_id, entry_data in entries:
                sensor_value = entry_data.get(b"value")
                timestamp = entry_data.get(b"time")

                if sensor_value and timestamp:
                    return {
                        "time": timestamp.decode("utf-8"),
                        "device": device.name,
                        "sensor_value": float(sensor_value.decode("utf-8")),
                    }
    except Exception as e:
        logger.error(f"Error fetching data from stream {stream_key}: {e}")
    return None


def is_recent_data(timestamp):
    """Check if data is within a 1-minute freshness window."""
    data_time = datetime.datetime.fromisoformat(timestamp)
    return data_time > datetime.datetime.utcnow() - datetime.timedelta(minutes=1)


def insert_data(data, sensor_type):
    """Insert parsed data into the PostgreSQL database."""
    if "sensor_value" not in data:
        logger.warning(f"Missing 'sensor_value' in data: {data}. Skipping insertion.")
        return

    insert_data_dict = {
        "time": data["time"],
        "device": data["device"],
        "metric": sensor_type.lower(),
        "value": data["sensor_value"],
    }

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            insert_query = """
            INSERT INTO sensor_readings (time, device_name, metric, value)
            VALUES (%s, %s, %s, %s);
            """
            cursor.execute(
                insert_query,
                (
                    insert_data_dict["time"],
                    insert_data_dict["device"],
                    insert_data_dict["metric"],
                    insert_data_dict["value"],
                ),
            )
        conn.commit()
        logger.info(
            f"Data inserted successfully for {insert_data_dict['device']}: {insert_data_dict}"
        )
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Failed to insert data: {e}")
    finally:
        if conn:
            return_db_connection(conn)


@periodic_task(crontab(minute="*/1"))
def fetch_data_from_all_devices():
    """Fetch and insert data for all devices based on their protocol."""
    # Use prefetch_related to avoid N+1 queries
    devices = Device.objects.prefetch_related('sensors__type').all()
    for device in devices:
        for sensor in device.sensors.all():
            data = None

            if device.protocol == "http":
                data = fetch_data_http(device, sensor)
            elif device.protocol == "mqtt":
                data = fetch_data_mqtt_stream(device, sensor)

            if data and is_recent_data(data["time"]):
                insert_data(data, sensor.type.name)
            else:
                logger.debug(f"No recent or valid data for {device.name}. Skipping.")


@periodic_task(crontab(minute="*/5"))
def last_5_minutes():
    """Fetch the last 5 readings from TimescaleDB and store them in Redis."""
    conn = None
    try:
        conn = get_db_connection()
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
                    "value": reading[3],
                }
                for reading in results
            ]
            redis_client = get_redis_client()
            redis_client.set("last5", json.dumps(data))
            logger.info(f"Last 5 readings updated: {len(data)} entries")
    except Exception as e:
        logger.error(f"Error fetching or storing the last 5 readings: {e}")
    finally:
        if conn:
            return_db_connection(conn)


# Removed import-time call to devices_to_redis() - should be called explicitly when needed
# or set up as a Django management command
