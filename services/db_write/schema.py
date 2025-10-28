"""
Schema definitions and data transformation logic.
Handles conversion between Redis stream messages and database records.
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Dict, Any
import json


@dataclass
class StreamMessage:
    """Represents a message from Redis stream"""
    stream_key: str
    message_id: str
    device_id: str
    sensor_type: str
    value: float
    timestamp: str
    metadata: Optional[Dict[str, Any]] = None
    
    @property
    def stream_name(self) -> str:
        """Return the stream name without prefix"""
        return self.stream_key


@dataclass
class SensorReading:
    """Represents a sensor reading ready for database insertion"""
    timestamp: datetime
    device_id: str
    sensor_type: str
    value: float
    metadata: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for database insertion"""
        return {
            'timestamp': self.timestamp,
            'device_id': self.device_id,
            'sensor_type': self.sensor_type,
            'value': self.value,
            'metadata': json.dumps(self.metadata) if self.metadata else None
        }


@dataclass
class ValidationResult:
    """Result of data validation"""
    valid: bool
    error: Optional[str] = None


class SchemaHandler:
    """Handles schema transformation and validation"""
    
    def __init__(self):
        self.logger = self._get_logger()
    
    def _get_logger(self):
        """Get logger instance"""
        import logging
        return logging.getLogger(__name__)
    
    def transform_message(self, stream_message: StreamMessage) -> Optional[SensorReading]:
        """
        Transform a Redis stream message into a SensorReading.
        Returns None if transformation fails.
        """
        try:
            # Parse timestamp
            timestamp = self._parse_timestamp(stream_message.timestamp)
            
            # Create sensor reading
            reading = SensorReading(
                timestamp=timestamp,
                device_id=stream_message.device_id,
                sensor_type=stream_message.sensor_type,
                value=float(stream_message.value),
                metadata=stream_message.metadata
            )
            
            # Validate the reading
            validation = self.validate_reading(reading)
            if not validation.valid:
                self.logger.error(f"Invalid reading: {validation.error}")
                return None
            
            return reading
            
        except Exception as e:
            self.logger.error(f"Failed to transform message: {e}", exc_info=True)
            return None
    
    def validate_reading(self, reading: SensorReading) -> ValidationResult:
        """Validate a sensor reading"""
        try:
            # Check required fields
            if not reading.device_id:
                return ValidationResult(False, "device_id is required")
            
            if not reading.sensor_type:
                return ValidationResult(False, "sensor_type is required")
            
            if reading.value is None:
                return ValidationResult(False, "value is required")
            
            # Validate timestamp
            if not isinstance(reading.timestamp, datetime):
                return ValidationResult(False, "timestamp must be a datetime object")
            
            # Validate value is numeric
            if not isinstance(reading.value, (int, float)):
                return ValidationResult(False, "value must be numeric")
            
            # Check for reasonable value ranges (can be customized)
            if reading.value < -1000000 or reading.value > 1000000:
                self.logger.warning(f"Value {reading.value} is outside typical range")
            
            return ValidationResult(True)
            
        except Exception as e:
            return ValidationResult(False, f"Validation error: {str(e)}")
    
    def _parse_timestamp(self, timestamp_str: str) -> datetime:
        """Parse timestamp string into datetime object"""
        # Try ISO format first
        try:
            return datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
        except ValueError:
            pass
        
        # Try common formats
        formats = [
            '%Y-%m-%dT%H:%M:%S.%fZ',
            '%Y-%m-%dT%H:%M:%SZ',
            '%Y-%m-%d %H:%M:%S.%f',
            '%Y-%m-%d %H:%M:%S',
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(timestamp_str, fmt)
            except ValueError:
                continue
        
        # If all else fails, use current time and log warning
        self.logger.warning(f"Could not parse timestamp '{timestamp_str}', using current time")
        return datetime.utcnow()
    
    def parse_stream_entry(self, stream_key: str, message_id: str, fields: Dict[bytes, bytes]) -> Optional[StreamMessage]:
        """
        Parse a raw Redis stream entry into a StreamMessage.
        Expected stream key format: mqtt_stream:{device_id}:{sensor_type}
        Expected fields: value, timestamp (and optionally metadata)
        """
        try:
            # Extract device_id and sensor_type from stream key
            # Format: mqtt_stream:{device_id}:{sensor_type}
            parts = stream_key.split(':')
            if len(parts) < 3:
                self.logger.error(f"Invalid stream key format: {stream_key}")
                return None
            
            device_id = parts[1]
            sensor_type = ':'.join(parts[2:])  # Handle sensor types with colons
            
            # Extract fields from message
            value_bytes = fields.get(b'value')
            timestamp_bytes = fields.get(b'timestamp') or fields.get(b'time')
            
            if not value_bytes or not timestamp_bytes:
                self.logger.error(f"Missing required fields in message: {fields}")
                return None
            
            # Parse metadata if present
            metadata = None
            metadata_bytes = fields.get(b'metadata')
            if metadata_bytes:
                try:
                    metadata = json.loads(metadata_bytes.decode('utf-8'))
                except json.JSONDecodeError:
                    self.logger.warning(f"Could not parse metadata: {metadata_bytes}")
            
            return StreamMessage(
                stream_key=stream_key,
                message_id=message_id,
                device_id=device_id,
                sensor_type=sensor_type,
                value=float(value_bytes.decode('utf-8')),
                timestamp=timestamp_bytes.decode('utf-8'),
                metadata=metadata
            )
            
        except Exception as e:
            self.logger.error(f"Failed to parse stream entry: {e}", exc_info=True)
            return None
