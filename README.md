# IoT Dashboard

Microservices-based IoT platform with device management, mTLS authentication, and time-series data storage.

**Architecture:** Device → MQTT (mTLS) → mqtt_ingestion → Redis → db_write → PostgreSQL/TimescaleDB

## Services

- **device_manager** - Device registration & X.509 certificates (FastAPI)
- **mqtt_ingestion** - MQTT → Redis pipeline  
- **db_write** - Redis → PostgreSQL writer
- **infrastructure** - Docker Compose (PostgreSQL, Redis, Mosquitto)


## License

MIT License
