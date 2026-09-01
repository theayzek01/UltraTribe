# === Stage 1: Base ===
FROM nvidia/cuda:12.4.1-cudnn-devel-ubuntu22.04 AS base

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 python3.11-venv python3-pip \
    ffmpeg libsndfile1 git curl && \
    rm -rf /var/lib/apt/lists/* && \
    ln -sf /usr/bin/python3.11 /usr/bin/python

WORKDIR /app
COPY pyproject.toml .
RUN pip install --no-cache-dir -e ".[dev]"

# === Stage 2: Train ===
FROM base AS train
COPY . .
RUN pip install --no-cache-dir -e ".[dev]"
CMD ["python", "-m", "ultratribe.core.experiment"]

# === Stage 3: Serve ===
FROM base AS serve
COPY . .
RUN pip install --no-cache-dir -e ".[serve]"
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1
CMD ["uvicorn", "ultratribe.api.server:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
