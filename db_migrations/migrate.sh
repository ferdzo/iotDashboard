#!/bin/bash
# Helper for Alembic migrations. Run from the db_migrations/ directory.
# Usage: ./migrate.sh {create "msg"|upgrade|current|history|downgrade [n]}
set -e
cd "$(dirname "$0")"

CMD="${1:-upgrade}"

case "$CMD" in
  create)
    shift
    uv run alembic revision --autogenerate -m "${*:-schema change}"
    ;;
  upgrade)
    uv run alembic upgrade head
    ;;
  current)
    uv run alembic current
    ;;
  history)
    uv run alembic history
    ;;
  downgrade)
    uv run alembic downgrade "${2:- -1}"
    ;;
  *)
    echo "Usage: $0 {create \"msg\"|upgrade|current|history|downgrade [rev]}" >&2
    exit 1
    ;;
esac
