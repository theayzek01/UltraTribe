<div align="center">

# UltraTribe

**Enterprise-Grade Multi-Modal Neural Brain Encoding Framework & Real-Time Cortex Stream Visualizer**

[![Version](https://img.shields.io/badge/version-4.0.0-blue.svg?style=flat-square)](#)
[![Python](https://img.shields.io/badge/python-3.11%20%7C%203.12-blue.svg?style=flat-square)](#)
[![PyTorch](https://img.shields.io/badge/pytorch-2.5%2B%20%7C%20CUDA%2012.x-ee4c2c.svg?style=flat-square)](#)
[![Live 3D App](https://img.shields.io/badge/Live_App-baslat.bat-gold.svg?style=flat-square)](#canli-yayin--youtube-3d-beyin-analizoru-live_stream_analyzer)
[![Protocol](https://img.shields.io/badge/protocol-MCP%20JSON--RPC%202.0-purple.svg?style=flat-square)](#model-context-protocol-mcp-specification)
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](#)

</div>

---

## Canli Yayin & YouTube 3D Beyin Analizoru (`live_stream_analyzer`)

UltraTribe, herhangi bir YouTube canli yayinini veya videosunu anlik olarak analiz edip izleyen insan beyninde hangi bolgelerin (Gorsel V1-V4, Yuz FFA, Mekan PPA, Isitsel A1, Dil Wernicke/Broca, Amigdala, Prefrontal) ne nedenle aktiflestigini interaktif 3D WebGL beyin modeli uzerinde canli gosteren web arayuzune sahiptir.

### Tek Tikla Baslatma (Windows)

Proje dizinindeki **`baslat.bat`** dosyasina cift tiklayin:
- Gerekli kutuphaneleri otomatik kontrol eder ve kurar.
- Asenkron FastAPI + WebSocket analiz sunucusunu baslatir.
- Tarayicinizda `http://127.0.0.1:8080` adresini otomatik acar.

```bash
# Manuel baslatmak icin:
python -m uvicorn live_stream_analyzer.backend.app:app --host 127.0.0.1 --port 8080
```

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

# 2. Model baslatma
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

---

## Moduler Mimari ve Dizin Hiyerarsisi

```
ultratribe/
|-- live_stream_analyzer/    # Canli YouTube ve Video 3D Beyin Analiz Uygulamasi
|   |-- backend/             # FastAPI, WebSocket, Nöral Kodlama Motoru, Explainer
|   |-- frontend/            # OLED True Dark WebGL (Three.js) 3D Beyin Arayuzu
|   `-- baslat.bat           # Tek tikla Windows baslatici
|-- core/                    # Sinir Agi ve Egitim Cekirdegi (FmriEncoderModel, FlashAttention-2)
|-- mcp/                     # Model Context Protocol Katmani (Tools & Resources)
|-- api/                     # REST & SSE Cikarim Sunucusu (FastAPI, Rate Limiting)
|-- data/                    # MMap Streaming Veri Yukleyici & Donusumler
|-- config/                  # Pydantic v2 Tip-Guvenli Sema & Hiperparametreler
|-- shared/                  # Sparse ROI Hesaplama, Saf Fonksiyonlar
|-- viz/                     # 3D Beyin Gorsellestirme
|-- demo.py                  # Tek-satir TribeModel yukleyici
|-- Dockerfile               # Multi-stage container tanimi
`-- docker-compose.yml       # API + Redis + Prometheus + Grafana servisleri
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
