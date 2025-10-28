import os
from dataclasses import dataclass
import dotenv
from typing import Optional

dotenv.load_dotenv()

@dataclass
class RedisConfig:
    host: str
    port: int = 6379
    db: int = 0
    password: Optional[str] = None

@dataclass
class MQTTConfig:
    broker: str
    port: int = 1883
    username: Optional[str] = None
    password: Optional[str] = None
    topic_pattern: str = "devices/#"
    keepalive: int = 60

@dataclass
class Payload:
    device_id: str
    sensor_type: str
    value: float
    timestamp: Optional[str] = None


class Config:
    def __init__(self):
        self.redis = RedisConfig(
            host=os.getenv('REDIS_HOST', 'localhost'),
            port=int(os.getenv('REDIS_PORT', 6379)),
            db=int(os.getenv('REDIS_DB', 0)),
            password=os.getenv('REDIS_PASSWORD', None)
        )
        self.mqtt = MQTTConfig(
            broker=os.getenv('MQTT_BROKER', 'localhost'),
            port=int(os.getenv('MQTT_PORT', 1883)),
            username=os.getenv('MQTT_USERNAME', None),
            password=os.getenv('MQTT_PASSWORD', None),
            topic_pattern=os.getenv('MQTT_TOPIC_PATTERN', 'devices/#'),
            keepalive=int(os.getenv('MQTT_KEEPALIVE', 60))
        )

config = Config()