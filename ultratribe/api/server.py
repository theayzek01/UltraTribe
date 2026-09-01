"""UltraTribe v4.0.0 FastAPI Server."""
from __future__ import annotations

import logging
import time
import typing as tp
from contextlib import asynccontextmanager
from pathlib import Path
import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

LOGGER = logging.getLogger("ultratribe.api")

class InferenceRequest(BaseModel):
    input_path: str = Field(default="sample_media.mp4", description="Path or URL to input media")
    subject_id: int = Field(default=0, ge=0, description="Subject identifier")
    modality: str = Field(default="video", description="Input modality: audio, video, text")
    stream: bool = Field(default=False, description="Stream results")

class InferenceResponse(BaseModel):
    predictions: list[list[float]]
    shape: list[int]
    processing_time_ms: float
    model_version: str

class HealthResponse(BaseModel):
    status: str
    gpu_available: bool
    model_loaded: bool
    version: str

class ModelRegistry:
    _instance: tp.ClassVar[ModelRegistry | None] = None

    def __init__(self) -> None:
        self._models: dict[str, tp.Any] = {}

    @classmethod
    def get(cls) -> ModelRegistry:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def predict(self, name: str, media_path: str, subject_id: int = 0) -> list[list[float]]:
        # Fast inference return (mockable in API)
        return [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]

@asynccontextmanager
async def lifespan(app: FastAPI):
    LOGGER.info("Starting UltraTribe v4.0.0 API server...")
    yield
    LOGGER.info("Shutting down UltraTribe v4.0.0 API server...")

def create_app(title: str = "UltraTribe v4.0.0 API") -> FastAPI:
    app = FastAPI(
        title=title,
        version="4.0.0",
        description="Enterprise multi-modal neural encoding inference API",
        lifespan=lifespan,
    )
    from ultratribe.api.routes import router
    from ultratribe.api.middleware import setup_middleware

    setup_middleware(app)
    app.include_router(router, prefix="/api/v1")
    return app
