# Django Backend Dockerfile
FROM ghcr.io/astral-sh/uv:python3.13-alpine AS builder

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1

COPY pyproject.toml uv.lock ./

RUN uv sync --frozen --no-dev --no-install-project

COPY iotDashboard/ ./iotDashboard/
COPY manage.py ./
COPY create_user.py ./

RUN uv sync --frozen --no-dev


FROM python:3.13-alpine

WORKDIR /app

RUN apk add --no-cache postgresql-client

COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/iotDashboard/ /app/iotDashboard/
COPY --from=builder /app/manage.py /app/
COPY --from=builder /app/create_user.py /app/
COPY db_migrations/ /app/db_migrations/
COPY entrypoint.sh /app/entrypoint.sh

RUN adduser -D -u 1000 appuser && \
    chown -R appuser:appuser /app && \
    chmod +x /app/entrypoint.sh

USER appuser

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1

EXPOSE 3000

ENTRYPOINT ["/app/entrypoint.sh"]
