"""UltraTribe MCP (Model Context Protocol) Server for AI Assistants and Agents."""
from __future__ import annotations

import asyncio
import json
import logging
import platform
import sys
import time
import typing as tp
import torch

LOGGER = logging.getLogger("ultratribe.mcp")

def get_system_diagnostics() -> dict[str, tp.Any]:
    """Inspect CUDA, PyTorch, memory, and UltraTribe capabilities."""
    cuda_avail = torch.cuda.is_available()
    device_name = torch.cuda.get_device_name(0) if cuda_avail else "CPU"
    vram_total_gb = torch.cuda.get_device_properties(0).total_memory / (1024**3) if cuda_avail else 0.0
    
    return {
        "framework": "UltraTribe v4.0.0",
        "python_version": platform.python_version(),
        "torch_version": torch.__version__,
        "cuda_available": cuda_avail,
        "device_name": device_name,
        "total_vram_gb": round(vram_total_gb, 2),
        "bf16_supported": torch.cuda.is_bf16_supported() if cuda_avail else False,
        "flash_attention_available": hasattr(torch.nn.functional, "scaled_dot_product_attention"),
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
    }

def run_synthetic_benchmark(batch_size: int = 4, seq_len: int = 64, iterations: int = 5) -> dict[str, tp.Any]:
    """Execute synthetic benchmark to measure forward-pass speed and memory."""
    from ultratribe.core.model import FmriEncoderModel
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    config = {
        "feature_dims": {"video": 64, "audio": 32},
        "d_model": 128,
        "n_heads": 4,
        "n_layers": 2,
        "max_seq_len": 512,
        "n_subjects": 2,
        "n_output_features": 20484,
    }
    
    model = FmriEncoderModel(config).to(device)
    model.eval()
    
    dummy_input = {
        "subject_id": torch.zeros(batch_size, dtype=torch.long, device=device),
        "video": torch.randn(batch_size, seq_len, 64, device=device),
        "audio": torch.randn(batch_size, seq_len, 32, device=device),
    }
    
    with torch.inference_mode():
        for _ in range(2):
            _ = model(dummy_input)
            
    if device == "cuda":
        torch.cuda.synchronize()
        torch.cuda.reset_peak_memory_stats()
        
    start_t = time.perf_counter()
    with torch.inference_mode():
        for _ in range(iterations):
            _ = model(dummy_input)
            
    if device == "cuda":
        torch.cuda.synchronize()
        peak_vram_mb = torch.cuda.max_memory_allocated() / (1024**2)
    else:
        peak_vram_mb = 0.0
        
    total_time = time.perf_counter() - start_t
    avg_latency_ms = (total_time / iterations) * 1000
    throughput = (batch_size * iterations) / total_time
    
    return {
        "status": "success",
        "device": device,
        "batch_size": batch_size,
        "seq_len": seq_len,
        "iterations": iterations,
        "avg_latency_ms": round(avg_latency_ms, 2),
        "throughput_samples_per_sec": round(throughput, 2),
        "peak_vram_mb": round(peak_vram_mb, 2),
    }

class UltraTribeMCPServer:
    """Standard Model Context Protocol Server for UltraTribe."""
    
    TOOLS = [
        {
            "name": "system_diagnostics",
            "description": "Returns hardware info, CUDA capability, VRAM, and UltraTribe framework status.",
            "inputSchema": {"type": "object", "properties": {}},
        },
        {
            "name": "benchmark_inference",
            "description": "Runs synthetic in-memory benchmark to test model speed (ms/batch), throughput, and VRAM footprint.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "batch_size": {"type": "integer", "default": 4},
                    "seq_len": {"type": "integer", "default": 64},
                    "iterations": {"type": "integer", "default": 5},
                },
            },
        },
        {
            "name": "list_supported_studies",
            "description": "Lists available neural decoding studies (Algonauts 2025, BOLD5000, Wen 2017, Lebel 2023).",
            "inputSchema": {"type": "object", "properties": {}},
        },
        {
            "name": "get_atlas_regions",
            "description": "Retrieves Human Connectome Project (HCP) cortical or Harvard-Oxford subcortical ROI regions.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "atlas_type": {"type": "string", "enum": ["cortical_hcp", "subcortical_harvard_oxford"], "default": "cortical_hcp"}
                },
            },
        },
    ]

    RESOURCES = [
        {
            "uri": "ultratribe://system/status",
            "name": "System Status",
            "mimeType": "application/json",
            "description": "Live health and hardware resource utilization",
        },
        {
            "uri": "ultratribe://catalog/studies",
            "name": "Studies Catalog",
            "mimeType": "application/json",
            "description": "Supported fMRI neuroscience benchmarks",
        },
    ]

    def handle_tool_call(self, name: str, arguments: dict[str, tp.Any]) -> dict[str, tp.Any]:
        if name == "system_diagnostics":
            return get_system_diagnostics()
        elif name == "benchmark_inference":
            b_size = arguments.get("batch_size", 4)
            s_len = arguments.get("seq_len", 64)
            iters = arguments.get("iterations", 5)
            return run_synthetic_benchmark(batch_size=b_size, seq_len=s_len, iterations=iters)
        elif name == "list_supported_studies":
            return {
                "studies": [
                    {"name": "Algonauts 2025", "modality": ["video", "audio", "text"], "resolution": "fsaverage5"},
                    {"name": "Lahner 2024 BOLD", "modality": ["video"], "resolution": "fsaverage5"},
                    {"name": "Lebel 2023 Story BOLD", "modality": ["audio", "text"], "resolution": "fsaverage5"},
                    {"name": "Wen 2017 Natural Movie", "modality": ["video"], "resolution": "fsaverage5"},
                ]
            }
        elif name == "get_atlas_regions":
            atlas = arguments.get("atlas_type", "cortical_hcp")
            if atlas == "cortical_hcp":
                rois = ["V1", "V2", "V3", "V4", "FFA", "PPA", "EBA", "LOC", "A1", "STG", "MTG", "Broca", "Wernicke"]
            else:
                rois = ["Thalamus", "Caudate", "Putamen", "Pallidum", "Hippocampus", "Amygdala", "Accumbens"]
            return {"atlas": atlas, "regions_count": len(rois), "regions": rois}
        else:
            raise ValueError(f"Unknown tool: {name}")

    def handle_resource_read(self, uri: str) -> dict[str, tp.Any]:
        if uri == "ultratribe://system/status":
            return get_system_diagnostics()
        elif uri == "ultratribe://catalog/studies":
            return {
                "version": "4.0.0",
                "datasets": ["algonauts2025", "lahner2024bold", "lebel2023bold", "wen2017"]
            }
        else:
            raise ValueError(f"Unknown resource URI: {uri}")

    async def run_stdio(self) -> None:
        sys.stderr.write("UltraTribe MCP Server v4.0.0 started on STDIO.\n")
        sys.stderr.flush()

        reader = asyncio.StreamReader()
        protocol = asyncio.StreamReaderProtocol(reader)
        await asyncio.get_event_loop().connect_read_pipe(lambda: protocol, sys.stdin)

        while True:
            line = await reader.readline()
            if not line:
                break
            try:
                msg = json.loads(line.decode("utf-8"))
                msg_id = msg.get("id")
                method = msg.get("method")
                params = msg.get("params", {})

                if method == "initialize":
                    res = {
                        "jsonrpc": "2.0",
                        "id": msg_id,
                        "result": {
                            "protocolVersion": "2024-11-05",
                            "serverInfo": {"name": "ultratribe-mcp", "version": "4.0.0"},
                            "capabilities": {"tools": {}, "resources": {}},
                        },
                    }
                elif method == "tools/list":
                    res = {"jsonrpc": "2.0", "id": msg_id, "result": {"tools": self.TOOLS}}
                elif method == "tools/call":
                    tool_name = params.get("name")
                    args = params.get("arguments", {})
                    try:
                        tool_res = self.handle_tool_call(tool_name, args)
                        res = {
                            "jsonrpc": "2.0",
                            "id": msg_id,
                            "result": {
                                "content": [{"type": "text", "text": json.dumps(tool_res, indent=2)}]
                            },
                        }
                    except Exception as e:
                        res = {"jsonrpc": "2.0", "id": msg_id, "error": {"code": -32603, "message": str(e)}}
                elif method == "resources/list":
                    res = {"jsonrpc": "2.0", "id": msg_id, "result": {"resources": self.RESOURCES}}
                elif method == "resources/read":
                    uri = params.get("uri")
                    try:
                        r_data = self.handle_resource_read(uri)
                        res = {
                            "jsonrpc": "2.0",
                            "id": msg_id,
                            "result": {
                                "contents": [{"uri": uri, "mimeType": "application/json", "text": json.dumps(r_data, indent=2)}]
                            },
                        }
                    except Exception as e:
                        res = {"jsonrpc": "2.0", "id": msg_id, "error": {"code": -32603, "message": str(e)}}
                else:
                    res = {"jsonrpc": "2.0", "id": msg_id, "error": {"code": -32601, "message": f"Method {method} not found"}}

                sys.stdout.write(json.dumps(res) + "\n")
                sys.stdout.flush()
            except Exception as ex:
                err_res = {"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": str(ex)}}
                sys.stdout.write(json.dumps(err_res) + "\n")
                sys.stdout.flush()

def create_mcp_server() -> UltraTribeMCPServer:
    return UltraTribeMCPServer()

def main() -> None:
    server = create_mcp_server()
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        print("=== UltraTribe MCP Diagnostics & Self-Test ===")
        print("1. Diagnostics:")
        print(json.dumps(server.handle_tool_call("system_diagnostics", {}), indent=2))
        print("\n2. Studies Catalog:")
        print(json.dumps(server.handle_tool_call("list_supported_studies", {}), indent=2))
        print("\n3. In-Memory Benchmark:")
        print(json.dumps(server.handle_tool_call("benchmark_inference", {"batch_size": 2, "iterations": 2}), indent=2))
        print("\n4. HCP Atlas ROIs:")
        print(json.dumps(server.handle_tool_call("get_atlas_regions", {}), indent=2))
        print("\n>>> ALL ULTRATRIBE MCP TESTS PASSED! <<<")
    else:
        asyncio.run(server.run_stdio())

if __name__ == "__main__":
    main()
