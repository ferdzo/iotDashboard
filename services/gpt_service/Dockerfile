FROM ghcr.io/astral-sh/uv:python3.13-alpine

WORKDIR /app

COPY pyproject.toml ./

RUN uv sync

COPY . .

CMD ["uv", "run", "uvicorn","main:app", "--host", "0.0.0.0" ,"--port", "8001"]
