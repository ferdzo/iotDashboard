"""
Configuration management for the database writer service.
Loads settings from environment variables with sensible defaults.
"""
import os
from dataclasses import dataclass
from typing import Optional
import dotenv

dotenv.load_dotenv()


@dataclass
class RedisConfig:
    """Redis connection configuration"""
    host: str
    port: int = 6379
    db: int = 0
    password: Optional[str] = None


@dataclass
class DatabaseConfig:
    """Database connection configuration"""
    url: Optional[str] = None
    host: Optional[str] = None
    port: int = 5432
    name: Optional[str] = None
    user: Optional[str] = None
    password: Optional[str] = None
    table_name: str = "sensor_readings"
    enable_timescale: bool = False
    
    def get_connection_string(self) -> str:
        """Build connection string from components or return URL"""
        if self.url:
            return self.url
        
        if not all([self.host, self.name, self.user, self.password]):
            raise ValueError("Either DATABASE_URL or all DB_* variables must be set")
        
        return f"postgresql://{self.user}:{self.password}@{self.host}:{self.port}/{self.name}"


@dataclass
class ConsumerConfig:
    """Redis consumer group configuration"""
    group_name: str = "db_writer"
    consumer_name: str = "worker-01"
    batch_size: int = 100
    batch_timeout_sec: int = 5
    processing_interval_sec: float = 1.0
    block_time_ms: int = 5000


@dataclass
class StreamConfig:
    """Redis stream configuration"""
    pattern: str = "mqtt_stream:*"
    dead_letter_stream: str = "mqtt_stream:failed"
    max_retries: int = 3
    trim_maxlen: int = 10000  # Keep last N messages in each stream


@dataclass
class LogConfig:
    """Logging configuration"""
    level: str = "INFO"
    format: str = "json"  # json or console


class Config:
    """Main configuration class"""
    
    def __init__(self):
        self.redis = RedisConfig(
            host=os.getenv('REDIS_HOST', 'localhost'),
            port=int(os.getenv('REDIS_PORT', 6379)),
            db=int(os.getenv('REDIS_DB', 0)),
            password=os.getenv('REDIS_PASSWORD', None) or None
        )
        
        self.database = DatabaseConfig(
            url=os.getenv('DATABASE_URL', None),
            host=os.getenv('DB_HOST', None),
            port=int(os.getenv('DB_PORT', 5432)),
            name=os.getenv('DB_NAME', None),
            user=os.getenv('DB_USER', None),
            password=os.getenv('DB_PASSWORD', None),
            table_name=os.getenv('TABLE_NAME', 'sensor_readings'),
            enable_timescale=os.getenv('ENABLE_TIMESCALE', 'false').lower() == 'true'
        )
        
        self.consumer = ConsumerConfig(
            group_name=os.getenv('CONSUMER_GROUP_NAME', 'db_writer'),
            consumer_name=os.getenv('CONSUMER_NAME', 'worker-01'),
            batch_size=int(os.getenv('BATCH_SIZE', 100)),
            batch_timeout_sec=int(os.getenv('BATCH_TIMEOUT_SEC', 5)),
            processing_interval_sec=float(os.getenv('PROCESSING_INTERVAL_SEC', 1.0)),
            block_time_ms=int(os.getenv('BLOCK_TIME_MS', 5000))
        )
        
        self.stream = StreamConfig(
            pattern=os.getenv('STREAM_PATTERN', 'mqtt_stream:*'),
            dead_letter_stream=os.getenv('DEAD_LETTER_STREAM', 'mqtt_stream:failed'),
            max_retries=int(os.getenv('MAX_RETRIES', 3)),
            trim_maxlen=int(os.getenv('TRIM_MAXLEN', 10000))
        )
        
        self.log = LogConfig(
            level=os.getenv('LOG_LEVEL', 'INFO'),
            format=os.getenv('LOG_FORMAT', 'json')
        )
    
    def validate(self):
        """Validate configuration"""
        errors = []
        
        # Validate Redis config
        if not self.redis.host:
            errors.append("REDIS_HOST is required")
        
        # Validate database config
        try:
            self.database.get_connection_string()
        except ValueError as e:
            errors.append(str(e))
        
        # Validate consumer config
        if self.consumer.batch_size < 1:
            errors.append("BATCH_SIZE must be >= 1")
        
        if errors:
            raise ValueError(f"Configuration errors: {', '.join(errors)}")
        
        return True


# Global config instance
config = Config()
