#!/bin/sh
# Backend container entrypoint: apply Django-managed tables, then serve.
# Alembic owns the shared schema; Django migrate only creates its own
# tables (dashboard_layouts, sessions, admin) — all other models are managed=False.
set -e
python manage.py migrate --noinput
exec python -m uvicorn iotDashboard.asgi:application --host 0.0.0.0 --port 3000
