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
class TelemetryReading:
    """Represents a telemetry reading ready for database insertion - matches Telemetry model"""

    time: datetime
    device_id: str
    metric: str  # renamed from sensor_type
    value: float
    unit: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for database insertion"""
        return {
            "time": self.time,
            "device_id": self.device_id,
            "metric": self.metric,
            "value": self.value,
            "unit": self.unit,
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

    def transform_message(
        self, stream_message: StreamMessage
    ) -> Optional[TelemetryReading]:
        """
        Transform a Redis stream message into a TelemetryReading.
        Returns None if transformation fails.
        """
        try:
            timestamp = self._parse_timestamp(stream_message.timestamp)

            reading = TelemetryReading(
                time=timestamp,
                device_id=stream_message.device_id,
                metric=stream_message.sensor_type,  # sensor_type maps to metric
                value=float(stream_message.value),
                unit=stream_message.metadata.get("unit")
                if stream_message.metadata
                else None,
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

    def validate_reading(self, reading: TelemetryReading) -> ValidationResult:
        """Validate a telemetry reading"""
        try:
            # Check required fields
            if not reading.device_id:
                return ValidationResult(False, "device_id is required")

            if not reading.metric:
                return ValidationResult(False, "metric is required")

            if reading.value is None:
                return ValidationResult(False, "value is required")

            if not isinstance(reading.time, datetime):
                return ValidationResult(False, "time must be a datetime object")

            if not isinstance(reading.value, (int, float)):
                return ValidationResult(False, "value must be numeric")

            if reading.value < -1000000 or reading.value > 1000000:
                self.logger.warning(f"Value {reading.value} is outside typical range")

            return ValidationResult(True)

        except Exception as e:
            return ValidationResult(False, f"Validation error: {str(e)}")

    def _parse_timestamp(self, timestamp_str: str) -> datetime:
        """Parse timestamp string into datetime object"""
        try:
            return datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
        except ValueError:
            pass

        formats = [
            "%Y-%m-%dT%H:%M:%S.%fZ",
            "%Y-%m-%dT%H:%M:%SZ",
            "%Y-%m-%d %H:%M:%S.%f",
            "%Y-%m-%d %H:%M:%S",
        ]

        for fmt in formats:
            try:
                return datetime.strptime(timestamp_str, fmt)
            except ValueError:
                continue

        self.logger.warning(
            f"Could not parse timestamp '{timestamp_str}', using current time"
        )
        return datetime.utcnow()

    def parse_stream_entry_new_format(
        self, stream_key: str, message_id: str, fields: Dict[bytes, bytes]
    ) -> Optional[StreamMessage]:
        """
        Parse a raw Redis stream entry with NEW single-stream format.
        Expected fields: device_id, metric, value, timestamp
        """
        try:
            # Extract fields from message (device_id and metric are IN the payload now!)
            device_id_bytes = fields.get(b"device_id")
            metric_bytes = fields.get(b"metric")
            value_bytes = fields.get(b"value")
            timestamp_bytes = fields.get(b"timestamp") or fields.get(b"time")

            if not all([device_id_bytes, metric_bytes, value_bytes, timestamp_bytes]):
                self.logger.error(f"Missing required fields in message: {fields}")
                return None

            # Parse metadata if present
            metadata = None
            metadata_bytes = fields.get(b"metadata")
            if metadata_bytes:
                try:
                    metadata = json.loads(metadata_bytes.decode("utf-8"))
                except json.JSONDecodeError:
                    self.logger.warning(f"Could not parse metadata: {metadata_bytes}")

            return StreamMessage(
                stream_key=stream_key,
                message_id=message_id,
                device_id=device_id_bytes.decode("utf-8"),
                sensor_type=metric_bytes.decode("utf-8"),
                value=float(value_bytes.decode("utf-8")),
                timestamp=timestamp_bytes.decode("utf-8"),
                metadata=metadata,
            )

        except Exception as e:
            self.logger.error(f"Failed to parse stream entry: {e}", exc_info=True)
            return None

    def parse_stream_entry(
        self, stream_key: str, message_id: str, fields: Dict[bytes, bytes]
    ) -> Optional[StreamMessage]:
        """
        DEPRECATED: Old format with stream key containing device_id.
        Kept for backward compatibility. Use parse_stream_entry_new_format() instead.
        """
        return self.parse_stream_entry_new_format(stream_key, message_id, fields)
