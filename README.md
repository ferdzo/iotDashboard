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

## Bring-up runbook (fresh clone to working stack)

Fast path — one command from the repo root (generates gitignored env
files + PKI, builds, starts, migrates):

```bash
./scripts/bootstrap.sh
```

Prerequisites: Docker with Compose v2, `uv`, `openssl`, ports 3000/5432/6379/8000/8001/8883 free.
What follows is exactly what the script does, step by step, for manual runs.

1. **Validate compose** (must pass with zero local edits):
   `docker compose -f infrastructure/compose.yml config > /dev/null`
2. **Bootstrap PKI** (certs are gitignored runtime artifacts, never commit them):
   `bash services/device_manager/generate_ca.sh localhost mosquitto`
   (writes to `./certs` relative to your CWD — move `ca.crt`, `server.crt`,
   `server.key` into `infrastructure/mosquitto/certs/`), then create an empty
   CRL (`openssl ca -gencrl`) as `ca.crl` — Mosquitto refuses to start with a
   `crlfile` that does not exist. If the certs dir is owned by UID 1883,
   fix ownership from inside a root container, never with host sudo:
   `docker run --rm -v ./infrastructure/mosquitto:/m alpine chown -R 1000:1000 /m/certs`
   The ingestion client identity (`ingestion.crt/key`, signed by the CA) must
   stay readable by UID 1000 (the service user).
3. **Start infrastructure**: `docker compose -f infrastructure/compose.yml up -d redis timescaledb mosquitto`
4. **Migrate**: `CONNECTION_STRING=postgresql://postgres:example@localhost:5432/iot_data ./db_migrations/migrate.sh upgrade`
   (DB name is `iot_data` everywhere; Alembic owns every table except
   `dashboard_layouts`, which is Django-managed. Never autogenerate against
   a shared database without trimming — see revision `dc7b523353d3`.)
5. **Create the first user**: `DATABASE_URL=... uv run python create_user.py --username admin --password ...`
6. **Start services** (each in dependency order, or all at once):
   `docker compose -f infrastructure/compose.yml up -d device-manager mqtt-ingestion db-write backend frontend`
7. **Verify**: mTLS publish to `devices/{id}/{metric}` on 8883 lands a row in
   `telemetry`; unauthenticated `GET /api/devices/` returns 401/403;
   `GET /api/` via the frontend returns JSON, not `index.html`.

**Stream triage** (Redis `mqtt:ingestion`, consumer group `db_writer`):
`XLEN mqtt:ingestion`, `XRANGE mqtt:ingestion - + COUNT 10`,
`XINFO GROUPS mqtt:ingestion`, `XPENDING mqtt:ingestion db_writer`.
Poison batches land in `mqtt:dlq` (fields include `reason`:
`parse-failed`, `transform-failed`, `db-write-failed`) — nothing is silently
dropped; a growing PEL with an empty DLQ means the writer is stuck, not fed.

**CRL rotation**: after any revoke/renew, the new `ca.crl` must be visible at
`infrastructure/mosquitto/certs/ca.crl`, then `docker compose restart mosquitto`
— Mosquitto only reads the CRL at startup.


## License

MIT License
