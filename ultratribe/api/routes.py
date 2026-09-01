"""FastAPI Inference Endpoints."""
from __future__ import annotations

import time
import torch
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from ultratribe.api.server import InferenceRequest, InferenceResponse, HealthResponse, ModelRegistry

router = APIRouter(tags=["inference"])

@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    return HealthResponse(
        status="healthy",
        gpu_available=torch.cuda.is_available(),
        model_loaded=True,
        version="4.0.0",
    )

@router.post("/predict", response_model=InferenceResponse)
async def predict(request: InferenceRequest) -> InferenceResponse:
    start_t = time.perf_counter()
    reg = ModelRegistry.get()
    res = reg.predict("default", request.input_path, request.subject_id)
    dur = (time.perf_counter() - start_t) * 1000
    return InferenceResponse(
        predictions=res,
        shape=[len(res), len(res[0]) if res else 0],
        processing_time_ms=round(dur, 2),
        model_version="4.0.0",
    )

@router.get("/models")
async def list_models() -> dict[str, list[str]]:
    return {"models": ["ultratribe-default", "ultratribe-large"]}
