# Stage 1: Builder - Install dependencies with uv
FROM ghcr.io/astral-sh/uv:python3.13-alpine AS builder

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1

COPY pyproject.toml uv.lock ./

RUN uv sync --frozen --no-dev --no-install-project

COPY . .

RUN uv sync --frozen --no-dev


FROM python:3.13-alpine

WORKDIR /app

COPY --from=builder /app/.venv /app/.venv

COPY --from=builder /app/src/ /app/src/

COPY --from=builder /app/*.py /app/

RUN adduser -D -u 1000 appuser && \
    chown -R appuser:appuser /app

USER appuser

ENV PATH="/app/.venv/bin:$PATH"

CMD ["python", "main.py"]
