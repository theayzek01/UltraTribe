"""FastAPI Backend Server & Real-Time WebSocket for Live Stream Brain Visualizer."""
from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from live_stream_analyzer.backend.cortex_engine import LiveCortexEngine, COGNITIVE_REGIONS
from live_stream_analyzer.backend.explainer import explain_brain_activity
from live_stream_analyzer.backend.stream_processor import StreamProcessor

LOGGER = logging.getLogger("ultratribe.live_server")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

app = FastAPI(title="UltraTribe Live Brain Cortex Analyzer", version="4.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
engine = LiveCortexEngine()
active_processor: StreamProcessor = StreamProcessor()

class StartStreamRequest(BaseModel):
    url: str

@app.get("/")
async def get_index():
    return FileResponse(FRONTEND_DIR / "index.html")

@app.get("/api/regions")
async def get_regions():
    return {"regions": COGNITIVE_REGIONS}

@app.post("/api/start")
async def start_stream(req: StartStreamRequest):
    global active_processor
    active_processor.release()
    active_processor = StreamProcessor(req.url)
    return {"status": "started", "source": req.url}

@app.post("/api/stop")
async def stop_stream():
    global active_processor
    active_processor.release()
    active_processor = StreamProcessor(None)
    return {"status": "stopped", "source": "synthetic_stimulus"}

@app.websocket("/ws/cortex")
async def websocket_cortex_endpoint(websocket: WebSocket):
    await websocket.accept()
    LOGGER.info("WebSocket client connected to live cortex stream.")
    try:
        while True:
            v_feat, a_feat, sensory_metrics, _ = active_processor.get_next_multimodal_frame()
            activations = engine.compute_cortex_activations(v_feat, a_feat)
            explanations = explain_brain_activity(activations, sensory_metrics)

            payload = {
                "type": "cortex_frame",
                "timestamp": sensory_metrics.get("timestamp_sec", 0.0),
                "activations": activations,
                "explanations": explanations,
                "sensory": sensory_metrics,
            }

            await websocket.send_text(json.dumps(payload))
            await asyncio.sleep(0.1)  # 10 FPS real-time update rate
    except WebSocketDisconnect:
        LOGGER.info("WebSocket client disconnected.")
    except Exception as e:
        LOGGER.error("WebSocket stream error: %s", e)

app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR / "static")), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8080)
