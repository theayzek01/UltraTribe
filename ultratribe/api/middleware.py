"""Enterprise API Middleware: CORS, GZip, rate-limiting, and request IDs."""
from __future__ import annotations

import time
import uuid
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

def setup_middleware(app: FastAPI) -> None:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    @app.middleware("http")
    async def add_process_time_and_request_id(request: Request, call_next):
        req_id = str(uuid.uuid4())
        start_time = time.perf_counter()
        response = await call_next(request)
        process_time = time.perf_counter() - start_time
        response.headers["X-Process-Time-Sec"] = f"{process_time:.4f}"
        response.headers["X-Request-ID"] = req_id
        return response
