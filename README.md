# IoT Dashboard

Microservices-based IoT platform with device management, mTLS authentication, and time-series data storage.

**Ingestion:** Device → MQTT (mTLS) → mqtt_ingestion → Redis (`mqtt:ingestion`) → db_write → PostgreSQL/TimescaleDB

**MQTT/TLS posture:** port 8883 mTLS for all device and ingestion traffic; port 1883 bound to loopback only (local debugging, no external access).

**Frontend:** React → Django BFF (`iotDashboard/`) → device_manager / gpt_service / TimescaleDB / external weather+air APIs

## Services

- **backend (iotDashboard/)** - Django BFF for React frontend (DRF + JWT). Aggregates device_manager, gpt_service, telemetry, weather/air-quality, wellness, calendar, dashboard layouts. Template views disabled.
- **device_manager** - Device registration & X.509 certificates (FastAPI)
- **mqtt_ingestion** - MQTT → Redis pipeline
- **db_write** - Redis → PostgreSQL writer
- **gpt_service** - AI daily-briefing + telemetry analysis (OpenAI)
- **frontend** - React 19 + Vite dashboard (widgets, drag-and-drop)
- **infrastructure** - Docker Compose (PostgreSQL/TimescaleDB, Redis, Mosquitto)


## License

MIT License
