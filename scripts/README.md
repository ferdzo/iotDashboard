# MQTT Data Generator

A Python script that simulates realistic environmental sensor data and publishes it to your MQTT broker for testing the IoT Dashboard.

## Features

✅ **8 Environmental Metrics**: Temperature, Humidity, CO2, Pressure, Light, Noise, PM2.5, VOC  
✅ **Realistic Patterns**: Daily cycles (office hours, night time)  
✅ **Random Walk**: Natural sensor drift and variations  
✅ **Anomaly Injection**: 5% chance of anomalies for testing alerts  
✅ **Self-Correcting**: Values drift back toward optimal ranges (simulates HVAC)  
✅ **TLS/mTLS Support**: Secure connections with certificates  

## Installation

```bash
# Install dependencies
pip install paho-mqtt

# Or using uv
uv pip install paho-mqtt
```

## Quick Start

### 1. Basic Usage (Localhost, No TLS)

```bash
python scripts/mqtt_data_generator.py --device-id office-sensor-01 --interval 5
```

### 2. With Specific Metrics

```bash
python scripts/mqtt_data_generator.py \
  --device-id lab-sensor \
  --metrics temperature humidity co2 \
  --interval 10
```

### 3. With TLS (Port 8883)

```bash
python scripts/mqtt_data_generator.py \
  --device-id secure-sensor \
  --broker localhost \
  --port 8883 \
  --tls \
  --ca-cert infrastructure/mosquitto/certs/ca.crt \
  --client-cert path/to/device.crt \
  --client-key path/to/device.key \
  --interval 5
```

### 4. Limited Duration (Testing)

```bash
# Run for 5 minutes
python scripts/mqtt_data_generator.py \
  --device-id test-sensor \
  --duration 300 \
  --interval 2
```

## Command Line Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `--broker` | No | localhost | MQTT broker hostname |
| `--port` | No | 1883 | MQTT broker port (8883 for TLS) |
| `--device-id` | **Yes** | - | Device ID for MQTT topics |
| `--metrics` | No | all | Specific metrics to publish |
| `--interval` | No | 5 | Publish interval in seconds |
| `--duration` | No | 0 | Run duration in seconds (0 = infinite) |
| `--tls` | No | False | Enable TLS/SSL encryption |
| `--ca-cert` | No | - | Path to CA certificate |
| `--client-cert` | No | - | Path to client certificate (mTLS) |
| `--client-key` | No | - | Path to client private key (mTLS) |

## Available Metrics

All metrics follow the standards in `services/gpt_service/METRICS_REFERENCE.md`:

- **temperature** - Indoor temperature (15-28°C)
- **humidity** - Relative humidity (20-70%)
- **co2** - Carbon dioxide concentration (400-1500 ppm)
- **pressure** - Atmospheric pressure (1000-1030 hPa)
- **light** - Illuminance (200-1000 lux)
- **noise** - Sound level (30-70 dB)
- **pm25** - Fine particulate matter (0-50 µg/m³)
- **voc** - Volatile organic compounds (0-500 ppb)

## MQTT Topic Format

Published to standard format: `devices/{device_id}/{metric}`

Examples:
- `devices/office-sensor-01/temperature`
- `devices/office-sensor-01/humidity`
- `devices/lab-sensor/co2`

## Data Patterns

### Daily Cycles
- **Business hours (9-17)**: Higher CO2, temperature, noise
- **Night time (22-6)**: Lower light, CO2, noise
- **All day**: Natural variations within ranges

### Realistic Behavior
- **Random walk**: Small incremental changes
- **Self-correcting**: HVAC-like drift toward optimal ranges
- **Anomalies**: 5% chance of spikes/drops for alert testing

### Example Values

```
[14:23:45] Iteration 1
  📊 temperature: 21.34 °C -> devices/office-sensor-01/temperature
  📊 humidity: 45.67 % -> devices/office-sensor-01/humidity
  📊 co2: 678.0 ppm -> devices/office-sensor-01/co2
  📊 pressure: 1015.23 hPa -> devices/office-sensor-01/pressure
  📊 light: 456.0 lux -> devices/office-sensor-01/light
  📊 noise: 42.5 dB -> devices/office-sensor-01/noise
  📊 pm25: 8.3 µg/m³ -> devices/office-sensor-01/pm25
  📊 voc: 120.0 ppb -> devices/office-sensor-01/voc
```

## Multi-Device Simulation

Run multiple instances with different device IDs:

```bash
# Terminal 1 - Office sensor
python scripts/mqtt_data_generator.py --device-id office-01 &

# Terminal 2 - Lab sensor
python scripts/mqtt_data_generator.py --device-id lab-01 &

# Terminal 3 - Warehouse sensor
python scripts/mqtt_data_generator.py --device-id warehouse-01 &
```

## Testing Scenarios

### Normal Operations
```bash
python scripts/mqtt_data_generator.py \
  --device-id normal-sensor \
  --interval 5
```

### High-Frequency Monitoring
```bash
python scripts/mqtt_data_generator.py \
  --device-id fast-sensor \
  --interval 1
```

### Limited Metrics (CO2 monitoring)
```bash
python scripts/mqtt_data_generator.py \
  --device-id co2-monitor \
  --metrics co2 temperature humidity \
  --interval 10
```

## Integration with IoT Dashboard

1. **Register device** (if using device_manager):
```bash
curl -X POST http://localhost:8000/devices/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Office Sensor","location":"Building A - Floor 2"}'
```

2. **Start data generator** with the device ID:
```bash
python scripts/mqtt_data_generator.py --device-id <device_id>
```

3. **View in dashboard**: Data will appear in the frontend automatically

4. **Test AI analysis**: Use the AI Insights widget to analyze patterns

## Troubleshooting

### Connection Refused
- Check MQTT broker is running: `docker compose -f infrastructure/compose.yml ps`
- Verify port: 1883 (plain) or 8883 (TLS)

### TLS Certificate Errors
- Ensure CA certificate path is correct
- For mTLS, verify client cert/key match device registration
- Check certificate hasn't expired

### No Data in Dashboard
- Verify mqtt_ingestion service is running
- Check Redis stream: `redis-cli XLEN mqtt:ingestion`
- Verify db_write service is running
- Check device_id matches registered device

### High CPU Usage
- Increase `--interval` value
- Reduce number of metrics
- Run fewer instances

## Performance

- **CPU**: ~1-2% per instance at 5s interval
- **Memory**: ~20MB per instance
- **Network**: ~100 bytes per metric per publish
- **Recommended**: Max 10 instances on a single machine

## Example Output

```
============================================================
🌡️  MQTT Environmental Sensor Data Generator
============================================================
Device ID: office-sensor-01
Metrics: temperature, humidity, co2, pressure, light, noise, pm25, voc
Interval: 5s
Duration: Infinite
============================================================
✓ Connected to MQTT broker at localhost:1883

[14:23:45] Iteration 1
  📊 temperature: 21.34 °C -> devices/office-sensor-01/temperature
  📊 humidity: 45.67 % -> devices/office-sensor-01/humidity
  📊 co2: 678.0 ppm -> devices/office-sensor-01/co2
  📊 pressure: 1015.23 hPa -> devices/office-sensor-01/pressure
  📊 light: 456.0 lux -> devices/office-sensor-01/light
  📊 noise: 42.5 dB -> devices/office-sensor-01/noise
  📊 pm25: 8.3 µg/m³ -> devices/office-sensor-01/pm25
  📊 voc: 120.0 ppb -> devices/office-sensor-01/voc

[14:23:50] Iteration 2
  ...
```

## Stopping the Generator

- **Ctrl+C**: Graceful shutdown
- **Automatic**: If `--duration` specified

## License

Part of the IoT Dashboard project.
