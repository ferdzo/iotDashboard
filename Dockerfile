# Django Backend Dockerfile
FROM ghcr.io/astral-sh/uv:python3.13-alpine AS builder

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies
RUN uv sync --frozen --no-dev --no-install-project

# Copy application code
COPY iotDashboard/ ./iotDashboard/
COPY manage.py ./
COPY create_user.py ./

# Sync the project
RUN uv sync --frozen --no-dev


# Stage 2: Runtime
FROM python:3.13-alpine

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache postgresql-client

# Copy virtual environment and application
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/iotDashboard/ /app/iotDashboard/
COPY --from=builder /app/manage.py /app/
COPY --from=builder /app/create_user.py /app/

# Create non-root user
RUN adduser -D -u 1000 appuser && \
    chown -R appuser:appuser /app

USER appuser

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1

EXPOSE 3000

# Run Django with uvicorn for ASGI
CMD ["python", "-m", "uvicorn", "iotDashboard.asgi:application", "--host", "0.0.0.0", "--port", "3000"]
