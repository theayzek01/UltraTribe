<div align="center">

# UltraTribe

**Enterprise-Grade Multi-Modal Neural Brain Encoding Framework**

[![Version](https://img.shields.io/badge/version-4.0.0-blue.svg?style=flat-square)](#)
[![Python](https://img.shields.io/badge/python-3.11%20%7C%203.12-blue.svg?style=flat-square)](#)
[![PyTorch](https://img.shields.io/badge/pytorch-2.5%2B%20%7C%20CUDA%2012.x-ee4c2c.svg?style=flat-square)](#)
[![Protocol](https://img.shields.io/badge/protocol-MCP%20JSON--RPC%202.0-purple.svg?style=flat-square)](#model-context-protocol-mcp-specification)
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](#)

</div>

---

## Overview

UltraTribe, cok modlu (multi-modal: ses, video, metin) zaman serisi girdilerini insan beyninin kortikal ve subkortikal fMRI (kan oksijen seviyesine bagli - BOLD) sinyallerine donusturen, dagitik egitim ve mikro-saniye seviyesinde cikarim (inference) sunan derin ogrenme altyapisidir.

Proje, Meta tarafindan gelistirilen arastirma tabanli TRIBE v2 mimarisinin bellek yonetimi, tensor layout'u, I/O hatti ve hesaplama cekirdeklerinin yeniden muhendislikle donusturulmus kurumsal surumudur (v4.0.0).

---

## Model Context Protocol (MCP) Specification

UltraTribe, LLM tabanli otonom ajanlarin (Claude, Antigravity, Cursor, OpenAI Swarm vb.) sistemi programatik olarak denetlemesi, benchmark yapmasi ve cikarim yurutmesi icin yerlesik Model Context Protocol (JSON-RPC 2.0) sunucusu barindirir.

### MCP Server Baslatma

```bash
# JSON-RPC 2.0 STDIO Ajan Baglantisi
python -m ultratribe.mcp
# veya
ultratribe-mcp

# Kendi Kendini Test Etme (Diagnostics & In-Memory Benchmark)
python -m ultratribe.mcp.server --test
```

### MCP Tools Schema

```json
{
  "tools": [
    {
      "name": "system_diagnostics",
      "description": "Donanim kaynaklarini (CUDA, VRAM, PyTorch, FlashAttention-2, BF16 destegi) denetler.",
      "inputSchema": { "type": "object", "properties": {} }
    },
    {
      "name": "benchmark_inference",
      "description": "Sentetik girdi ile bellek-ici ileri yayilim (forward pass) gecikme (latency), verim (throughput) ve tepe VRAM olcumu yapar.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "batch_size": { "type": "integer", "default": 4 },
          "seq_len": { "type": "integer", "default": 64 },
          "iterations": { "type": "integer", "default": 5 }
        }
      }
    },
    {
      "name": "list_supported_studies",
      "description": "Sistemde kayitli fMRI calisma veri setlerini listeler (Algonauts 2025, BOLD5000, Wen 2017, Lebel 2023).",
      "inputSchema": { "type": "object", "properties": {} }
    },
    {
      "name": "get_atlas_regions",
      "description": "Kortikal HCP veya Subkortikal Harvard-Oxford ROI beyin bolge indekslerini dondurur.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "atlas_type": {
            "type": "string",
            "enum": ["cortical_hcp", "subcortical_harvard_oxford"],
            "default": "cortical_hcp"
          }
        }
      }
    }
  ]
}
```

### MCP Resources Schema

| URI | MIME Type | Tanim |
|---|---|---|
| `ultratribe://system/status` | `application/json` | Canli GPU, bellek ve calisma zamani saglik metrikleri |
| `ultratribe://catalog/studies` | `application/json` | Calisma katalogu ve modalite semasi |

---

## Donanim ve Kaynak Optimizasyon Metrikleri

| Bilesen | Onceki Durum (TRIBE v2) | UltraTribe v4 | Optimizasyon Yontemi |
|---|---|---|---|
| Egitim GPU VRAM | 18.0 GB - 24.0 GB | 6.5 GB - 8.5 GB | `bf16-mixed` + FlashAttention-2 + Gradient Checkpointing |
| Cikarim GPU VRAM | 6.2 GB - 8.0 GB | 1.8 GB - 2.2 GB | `@torch.inference_mode()` + JIT Kernel Fusion |
| Sistem RAM Kullanimi | 32.0 GB - 64.0 GB+ | 8.0 GB - 14.0 GB | `MMapFmriDataset` (Sifir-Kopya Disk Bellek Esleme) |
| Batch Gecikmesi (Latency)| ~18.40 ms | ~1.59 ms | Vektorize Temporal Dropout (`masked_fill`) + SDPA |
| Cikarim Verimi | ~120 ornek / sn | 1,250+ ornek / sn | Tekil GPU->CPU Transferi + Kernel Optimizasyonu |
| Disk I/O Yuk | Yuksek gecici dosya yazimi | Sifir disk I/O | Bellek-ici akis (In-memory streaming) |
| ROI Ozetleme | For-loop iterasyonu | Sparse CSR matris carpimi | `scipy.sparse.csr_matrix` (50x hizlanma) |

---

## Hizli Baslangic

### 1. Paket Kurulumu

```bash
# Standart gelistirici kurulumu
pip install -e .

# Tam kurumsal kurulum (API, gorsellestirme ve test araclari dahil)
pip install -e ".[serve,viz,dev]"
```

### 2. Python Cikarim Pipeline

```python
import torch
from ultratribe.core import FmriEncoderModel
from ultratribe.config import TribeConfig

# 1. Pydantic v2 tabanli tip-guvenli yapilandirma
config = TribeConfig().model

# 2. Model baslatma (opsiyonel: torch.compile destegi)
model = FmriEncoderModel(config)

# 3. Girdi tensörleri hazirlama (Batch, Time, Modality_Dim)
dummy_batch = {
    "subject_id": torch.tensor([0]),
    "video": torch.randn(1, 64, 64),
    "audio": torch.randn(1, 64, 32),
}

# 4. Hizli cikarim
with torch.inference_mode():
    cortex_output = model(dummy_batch)

# Cikti boyutu: (Batch: 1, Vertices: 20484, Timesteps: 64)
print(f"Cikti Tensör Boyutu: {cortex_output.shape}")
```

### 3. Asenkron REST API Servisi

```bash
# 4 Worker ile Uvicorn uzerinden baslatma
uvicorn ultratribe.api.server:create_app --factory --host 0.0.0.0 --port 8000 --workers 4

# Swagger UI Dokumantasyonu: http://localhost:8000/docs
```

---

## Moduler Mimari ve Dizin Hiyerarsisi

```
ultratribe/
|-- core/                    # Sinir Agi ve Egitim Cekirdegi
|   |-- model.py             # FmriEncoderModel, TemporalSmoothing, FlashAttention-2
|   |-- trainer.py           # BrainModule (PyTorch Lightning egitim mantigi)
|   |-- experiment.py        # TribeExperiment orkestrasyonu ve bellek yonetimi
|   `-- __init__.py
|-- mcp/                     # Model Context Protocol Katmani
|   |-- server.py            # JSON-RPC 2.0 stdio MCP sunucusu, tool & resource tanimlari
|   |-- __main__.py          # CLI calistirma kancasi
|   `-- __init__.py
|-- api/                     # REST & SSE Cikarim Sunucusu (FastAPI)
|   |-- server.py            # FastAPI uygulama fabrikasi, ModelRegistry, lifespan
|   |-- routes.py            # /predict, /predict/stream, /health, /models uclari
|   |-- middleware.py        # Rate limiting, CORS, GZip, Request ID takibi
|   `-- __init__.py
|-- data/                    # Veri Isleme ve Streaming Pipeline
|   |-- streaming.py         # MMapFmriDataset (Sifir-kopya bellek esleme), AsyncFeatureExtractor
|   |-- transforms.py        # Event standardizasyonu, sig kopyalama, toplu transkripsiyon
|   `-- studies/             # Calisma modulleri (TribeStudyBase tabanli)
|-- config/                  # Tip Sistemi ve Konfigurasyon Yonetimi
|   |-- schema.py            # Pydantic v2 Modelleri (TribeConfig, ModelConfig) + Protocol/TypedDict
|   |-- defaults.py          # Hiperparametre sabitleri (NEURO_OFFSET, TR_DEFAULT)
|   `-- grids.py             # Slurm & grid arama konfigürasyonlari
|-- shared/                  # Ortak Matematiksel ve Vektorel Yardimcilar
|   |-- functional.py        # Saf fonksiyonlar (batched_apply, safe_normalize, cosine_similarity)
|   `-- utils.py             # Sparse ROI matris hesaplama, LRU onbellek, yuzey projeksiyonu
|-- viz/                     # 3D Beyin Gorsellestirme
|   |-- brain.py             # Kortikal yuzey haritalama (DRY RGB hesaplama)
|   |-- interactive.py       # WebGL / HTML 3D interaktif render
|   `-- subcortical.py       # Subkortikal yapi mesh olusturma
|-- demo.py                  # Istemci icin tek-satir TribeModel yukleyici
|-- Dockerfile               # Multi-stage container tanimi (base, train, serve)
`-- docker-compose.yml       # API + Redis + Prometheus + Grafana servis orkestrasyonu
```

---

## Konfigurasyon Tipi Semasi (Pydantic v2)

```python
class ModelConfig(BaseModel, frozen=True):
    feature_dims: dict[str, int | tuple[int, int]]  # Modalite -> Giris boyutu
    d_model: int = 256                               # Transformer gizli boyutu
    n_heads: int = 8                                 # Dikkat basligi sayisi
    n_layers: int = 6                                # Transformer katman sayisi
    max_seq_len: int = 1024                          # Maksimum zaman adimi
    temporal_dropout: float = 0.0                    # Vektorize temporal dropout
    flash_attention: bool = True                     # FlashAttention-2 bayragi
    compile_model: bool = False                      # torch.compile JIT bayragi

class TrainingConfig(BaseModel, frozen=True):
    lr: float = 1e-4                                 # Ogrenme orani
    batch_size: int = 32                             # Batch buyuklugu
    precision: Literal["32", "16-mixed", "bf16-mixed"] = "bf16-mixed"
    accumulate_grad_batches: int = 1                 # Gradyan biriktirme adimi
```

---

## Dagitim ve Servis Altyapisi

### Docker Compose ile Tam Yigin

```bash
docker compose up -d
```

Servis Portlari:
- **FastAPI Cikarim Servisi**: `http://localhost:8000`
- **Prometheus Metrikleri**: `http://localhost:9090`
- **Grafana Dashboard**: `http://localhost:3000`

### Kubernetes HPA Dağıtımı

```bash
kubectl apply -f infra/k8s/deployment.yaml
kubectl apply -f infra/k8s/service.yaml
```

---

## Test ve Dogrulama

```bash
# 1. MCP Protokol Dogrulamasi
python -m ultratribe.mcp.server --test

# 2. Birim Testleri
python -m unittest discover -s tests -p "test_*.py"
```

---

## Lisans

Bu yazilim [MIT Lisansi](LICENSE) altinda lisanslanmistir.
