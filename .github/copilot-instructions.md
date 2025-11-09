The following concise instructions help AI coding agents become productive in this repository.

Purpose
- This repo is a microservices-based IoT platform for device management, data ingestion, and telemetry storage. The system uses MQTT with mTLS authentication, Redis streams for message queuing, and PostgreSQL/TimescaleDB for persistent storage.

Never forget to involve human developers for more complex tasks and decisions. You are encouraged to ask more.

Big Picture
- Architecture: Device → MQTT (mTLS) → mqtt_ingestion → Redis → db_write → PostgreSQL/TimescaleDB
- Components:
  - `services/device_manager/` — FastAPI service for device registration, X.509 certificate issuance, and lifecycle management
  - `services/mqtt_ingestion/` — MQTT client that subscribes to device topics and writes to single Redis stream `mqtt:ingestion`
  - `services/db_write/` — Consumer service that reads from Redis streams and writes to database using consumer groups
  - `db_migrations/` — Alembic migrations for schema management (SQLAlchemy models)
  - `infrastructure/` — Docker Compose setup (PostgreSQL, Redis, Mosquitto MQTT broker)
  - `iotDashboard/` — Legacy Django app (being phased out)

Key Files To Read First
- `db_migrations/models.py` — SQLAlchemy models: `Device`, `DeviceCertificate`, `Telemetry`. Canonical schema definition.
- `services/device_manager/app/app.py` — FastAPI endpoints for device registration, certificate management, revocation, renewal.
- `services/device_manager/app/cert_manager.py` — X.509 certificate generation, CA management, CRL generation.
- `services/mqtt_ingestion/src/mqtt_client.py` — MQTT subscriber that parses `devices/{device_id}/{metric}` topics.
- `services/mqtt_ingestion/src/redis_writer.py` — Writes to single stream `mqtt:ingestion` with device_id, metric, value, timestamp.
- `services/db_write/src/redis_reader.py` — Consumer group reader for `mqtt:ingestion` stream.
- `services/db_write/src/db_writer.py` — Batch writes to `telemetry` table using SQLAlchemy.
- `infrastructure/compose.yml` — Docker services: PostgreSQL/TimescaleDB, Redis, Mosquitto MQTT.
- `infrastructure/mosquitto/mosquitto.conf` — MQTT broker config with mTLS on port 8883, CRL checking enabled.

Important Conventions & Patterns
- **Single stream architecture**: All MQTT data flows through one Redis stream `mqtt:ingestion`. Each message contains `device_id`, `metric`, `value`, `timestamp`.
- **MQTT topics**: Standard format `devices/{device_id}/{metric}`. Examples: `devices/abc123/temperature`, `devices/xyz789/humidity`.
- **Certificate IDs**: Use certificate serial number (hex format) as primary key in `device_certificates` table. Multiple certificates per device supported.
- **Package manager**: All services use `uv` for dependency management (`pyproject.toml` not `requirements.txt`).
- **Database migrations**: Use Alembic for schema changes. Run migrations from `db_migrations/` directory.
- **Configuration**: All services use `.env` files. Never hardcode hosts/credentials.
- **Import organization**: Services have `app/` or `src/` package structure. Import as `from app.module import ...` or `from src.module import ...`.
- **Consumer groups**: `db_write` uses Redis consumer groups for at-least-once delivery. Consumer name must be unique per instance.

Developer Workflows (commands & notes)
- **Start infrastructure**: `cd infrastructure && docker compose up -d` (Postgres, Redis, Mosquitto)
- **Run database migrations**: `cd db_migrations && uv run alembic upgrade head`
- **Generate CA certificate**: `cd services/device_manager && ./generate_ca.sh` (first time only)
- **Run device_manager**: `cd services/device_manager && uv run uvicorn app.app:app --reload --port 8000`
- **Run mqtt_ingestion**: `cd services/mqtt_ingestion && uv run main.py`
- **Run db_write**: `cd services/db_write && uv run main.py`
- **Register device**: `curl -X POST http://localhost:8000/devices/register -H "Content-Type: application/json" -d '{"name":"test","location":"lab"}'`
- **Test MQTT with mTLS**: `mosquitto_pub --cafile ca.crt --cert device.crt --key device.key -h localhost -p 8883 -t "devices/abc123/temperature" -m "23.5"`
- **Inspect Redis stream**: `redis-cli XLEN mqtt:ingestion` and `redis-cli XRANGE mqtt:ingestion - + COUNT 10`
- **Check consumer group**: `redis-cli XINFO GROUPS mqtt:ingestion`
- **View CRL**: `openssl crl -in infrastructure/mosquitto/certs/ca.crl -text -noout`

Integration Points & Gotchas
- **Environment variables**: All services load from `.env` files. No defaults - service will fail if required vars missing. Copy `.env.example` first.
- **Certificate paths**: `device_manager` writes CRL to `infrastructure/mosquitto/certs/ca.crl`. Mosquitto must restart after CRL updates.
- **Database schema**: Schema changes require Alembic migration. Never modify tables manually. Use `alembic revision --autogenerate`.
- **MQTT topic parsing**: `mqtt_ingestion` expects exactly `devices/{device_id}/{metric}` (3 parts). Invalid topics are logged and dropped.
- **Redis stream format**: `mqtt:ingestion` messages must have `device_id`, `metric`, `value`, `timestamp` fields (all strings).
- **Consumer groups**: `db_write` creates consumer group `db_writer` automatically. Don't delete it manually.
- **Certificate serial numbers**: Used as primary key in `device_certificates.id`. Extract with `format(cert.serial_number, 'x')`.
- **TimescaleDB hypertables**: `telemetry` table is a hypertable. Don't add constraints that break time partitioning.
- **File permissions**: Mosquitto directories may be owned by UID 1883. Fix with `sudo chown -R $USER:$USER infrastructure/mosquitto/`.

What AI agents should do first
- **Read architecture first**: Check `README.md` for current architecture. System is microservices-based, not Django monolith.
- **Check database schema**: Always start with `db_migrations/models.py` to understand data model.
- **Don't change stream names**: Single stream `mqtt:ingestion` is used by mqtt_ingestion and db_write. Changing breaks both services.
- **Use proper imports**: Services use package structure. Import from `app.*` or `src.*`, not relative imports.
- **Create migrations**: Schema changes require `alembic revision --autogenerate`. Never modify models without migration.
- **Test with real infrastructure**: Use `docker compose up` for integration testing. Unit tests are insufficient for this architecture.
- **Check .env files**: Each service has `.env.example`. Copy and configure before running.

Examples (copyable snippets)
- **Write to single stream** (mqtt_ingestion):
  ```python
  redis_client.xadd("mqtt:ingestion", {
      "device_id": device_id,
      "metric": sensor_type,
      "value": str(value),
      "timestamp": datetime.utcnow().isoformat()
  })
  ```

- **Read from stream with consumer group** (db_write):
  ```python
  results = redis_client.xreadgroup(
      groupname="db_writer",
      consumername="worker-01",
      streams={"mqtt:ingestion": ">"},
      count=100,
      block=5000
  )
  ```

- **Extract certificate serial number**:
  ```python
  from cryptography import x509
  cert = x509.load_pem_x509_certificate(cert_pem)
  cert_id = format(cert.serial_number, 'x')
  ```

- **Query active certificates**:
  ```python
  device_cert = db.query(DeviceCertificate).filter(
      DeviceCertificate.device_id == device_id,
      DeviceCertificate.revoked_at.is_(None)
  ).first()
  ```

If you add or change docs
- Update `README.md` for architecture changes
- Update `.github/copilot-instructions.md` for development workflow changes  
- Update service-specific READMEs (`services/*/README.md`) for API or configuration changes
- Document environment variables in `.env.example` files
- Add migration notes to Alembic revision if schema change is complex

If anything in these instructions looks off or incomplete for your current refactor, tell me what you'd like to focus on and I'll iterate.
