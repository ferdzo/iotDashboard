FROM ghcr.io/astral-sh/uv:python3.13-alpine

COPY ./pyproject.toml ./

COPY ./uv.lock ./

RUN uv sync

COPY ./app/ ./app/

ENTRYPOINT [ "uv", "run", "uvicorn", "app.app:app", "--host", "0.0.0.0", "--port", "8000" ]