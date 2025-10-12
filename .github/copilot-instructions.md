The following concise instructions help AI coding agents become productive in this repository.

Purpose
- This repo is a small Django-based IoT dashboard that ingests sensor data via MQTT, stores metadata in Django models, temporarily queues messages in Redis (streams/hashes), and persistently stores timeseries in Postgres/Timescale via background tasks (Huey).

Big Picture
- Components:
  - `iotDashboard/` — Django app (models, views, templates, tasks)
  - `manage.py` — Django CLI
  - `mqtt_service.py` — standalone MQTT client that subscribes to device topics and writes to Redis
  - `tasks.py` — Huey periodic tasks that read Redis and write to Postgres
  - Redis — used for device metadata (`mqtt_devices`), per-sensor streams and latest-value hashes
  - Postgres/Timescale — final storage for `sensor_readings` table (raw SQL used in places)

Key Files To Read First
- `iotDashboard/settings.py` — central settings; environment variables expected: `SECRET_KEY`, `CONNECTION_STRING`, `MQTT_BROKER`, `MQTT_USER`, `MQTT_PASS`, `REDIS_HOST`.
- `iotDashboard/models.py` — `Device`, `Sensor`, `SensorType`; these shape how devices and sensors are represented.
- `mqtt_service.py` — where MQTT messages are received and written to Redis. Important for stream naming and payload format.
- `iotDashboard/tasks.py` — Huey tasks that consume Redis and insert into the DB. Shows ingestion logic and timescale interactions.
- `iotDashboard/views.py` and `templates/chart.html` — how the UI reads `mqtt_latest`/Timescale data and what format it expects.

Important Conventions & Patterns
- Redis usage: repo stores device metadata under `mqtt_devices` (JSON), and the code uses Redis streams and hashes inconsistently. When changing stream behavior, update both `mqtt_service.py` and `tasks.py` to remain compatible.
- Topic/Stream canonicalization: adopt a single convention: MQTT topic `devices/{device_id}/{sensor}` and Redis stream `mqtt_stream:{device_id}:{sensor}`. Latest-value hash pattern: `mqtt_latest:{device_id}`.
- No `requirements.txt` in repo; use `python-dotenv` + `redis`, `paho-mqtt`, `huey`, `psycopg2-binary`, `requests`, `Django` (4.2) — add a `requirements.txt` before running.
- Avoid import-time side-effects: `tasks.py` currently opens Redis and calls `devices_to_redis()` at import time — refactor to lazy init or a management command.

Developer Workflows (commands & notes)
- Run Django dev server (use virtualenv and install deps):
  - `pip install -r requirements.txt` (create this file if missing)
  - `python manage.py migrate`
  - `python manage.py runserver`
- Run MQTT service locally (requires Redis & MQTT broker):
  - `python mqtt_service.py`
  - Example publish: `mosquitto_pub -t "devices/esp32/test_temperature" -m "23.5"`
- Huey tasks:
  - The project uses `huey.contrib.djhuey`; run workers with Django settings: `python manage.py run_huey` (ensure huey is installed and configured in `HUEY` setting).
- Inspect Redis during debugging:
  - `redis-cli KEYS "mqtt*"`
  - `redis-cli XREVRANGE mqtt_stream:mydevice:temperature + - COUNT 10`
  - `redis-cli HGETALL mqtt_latest:mydevice`

Integration Points & Gotchas
- Environment variables: many hosts/credentials are taken from `.env` via `python-dotenv`. If missing, code sometimes falls back to defaults or will raise at runtime. Add `.env` or set env vars in the system.
- DB access: `tasks.py` sometimes uses `psycopg2.connect(settings.CONNECTION_STRING)` while views use Django connections. If you change DB config, update both patterns or consolidate to Django connections.
- Topic parsing: `mqtt_service.py` expects at least 3 topic parts (it reads `topic_parts[2]`) — be defensive when editing.
- Stream payloads: `xadd` must receive simple string fields (no nested dicts). When changing stream layout, update the reader in `tasks.py` accordingly.
- Logging: repo uses `print` widely. Prefer converting prints to Python `logging` for maintainability.

What AI agents should do first
- Do not change stream/topic names unless you update both `mqtt_service.py` and `tasks.py`.
- Remove import-time Redis initializations and `exit()` calls; move to lazily-created client getters or management commands.
- Centralize config in `settings.py` and import `from django.conf import settings` in scripts instead of hardcoded IPs.
- When making API/DB changes, prefer to update `views.py` and `tasks.py` together and add short integration tests using `pytest` and a Redis test double (or local docker-compose).

Examples (copyable snippets)
- XADD to create canonical stream entry:
  - `redis_client.xadd(f"mqtt_stream:{device_id}:{sensor}", {"value": str(sensor_value), "time": datetime.utcnow().isoformat()})`
- Create/read consumer group (ingest):
  - `redis_client.xgroup_create(stream, "ingest", id="0", mkstream=True)`
  - `entries = redis_client.xreadgroup("ingest", consumer_name, {stream: ">"}, count=10, block=5000)`

If you add or change docs
- Update `README.md` with a simple `docker-compose.yml` recipe for Redis/Postgres/Mosquitto and document environment variables. Update `env.sample` with `REDIS_HOST`, `CONNECTION_STRING`, `MQTT_BROKER`, `MQTT_USER`, `MQTT_PASS`.

If anything in these instructions looks off or incomplete for your current refactor, tell me what you'd like to focus on and I'll iterate.
