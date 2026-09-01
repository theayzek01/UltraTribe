"""UltraTribe v4.0.0 — Pydantic v2 Schema & TypeScript-level Type System."""
from __future__ import annotations

import typing as tp
from pathlib import Path
from typing import Literal, Protocol, TypedDict, runtime_checkable

import numpy as np
import numpy.typing as npt
import torch
from torch import Tensor
from pydantic import BaseModel, Field, field_validator

# --- Tensor Shape Semantics ---
BatchTensor = Tensor      # Shape: (B, ...)
TimeTensor = Tensor       # Shape: (B, T, D)
SpatialTensor = Tensor    # Shape: (B, D, T)
FmriTensor = Tensor       # Shape: (B, n_vertices, T)

# --- Numpy Type Aliases ---
FmriArray = npt.NDArray[np.float32]
VertexArray = npt.NDArray[np.float32]
ROIMask = npt.NDArray[np.bool_]

# --- String Literal Types ---
ModalityType = Literal["audio", "video", "text", "image"]
HemisphereType = Literal["lh", "rh", "both"]
PrecisionType = Literal["32", "16-mixed", "bf16-mixed"]
SplitType = Literal["train", "val", "test"]

# --- TypedDict for Structured Payloads ---
class BatchData(TypedDict, total=False):
    subject_id: int
    audio: Tensor
    video: Tensor
    text: Tensor
    image: Tensor

class TrainingMetrics(TypedDict):
    loss: float
    learning_rate: float
    epoch: int

class ROIResult(TypedDict):
    name: str
    values: FmriArray
    hemisphere: HemisphereType

# --- Protocols (Interfaces) ---
@runtime_checkable
class Predictable(Protocol):
    def predict(self, inputs: tp.Any) -> tp.Any: ...

@runtime_checkable
class GroupedMetric(Protocol):
    is_grouped: bool

@runtime_checkable
class Downloadable(Protocol):
    def _download(self) -> None: ...

# --- Pydantic v2 Immutable Configurations ---
class ModelConfig(BaseModel, frozen=True):
    feature_dims: dict[str, int | tuple[int, int]] = Field(
        default_factory=lambda: {"video": 64, "audio": 32},
        description="Modality to feature dimension mapping",
    )
    d_model: int = Field(default=256, ge=32, le=4096, description="Transformer hidden dimension")
    n_heads: int = Field(default=8, ge=1, le=64)
    n_layers: int = Field(default=6, ge=1, le=48)
    max_seq_len: int = Field(default=1024, ge=32)
    temporal_dropout: float = Field(default=0.0, ge=0.0, le=1.0)
    attn_dropout: float = Field(default=0.1, ge=0.0, le=1.0)
    ff_dropout: float = Field(default=0.1, ge=0.0, le=1.0)
    flash_attention: bool = Field(default=True, description="Enable FlashAttention-2")
    compile_model: bool = Field(default=False, description="Enable torch.compile")
    gradient_checkpointing: bool = Field(default=False)
    hidden: int = Field(default=256)
    extractor_aggregation: Literal["stack", "sum", "cat"] = "cat"
    layer_aggregation: Literal["mean", "cat"] = "cat"
    modality_dropout: float = Field(default=0.0, ge=0.0, le=1.0)
    low_rank_head: int | None = None
    linear_baseline: bool = False
    time_pos_embedding: bool = True
    subject_embedding: bool = False
    n_subjects: int = 10

    @field_validator("d_model")
    @classmethod
    def d_model_divisible_by_heads(cls, v: int, info: tp.Any) -> int:
        n_heads = info.data.get("n_heads", 8) if info.data else 8
        if v % n_heads != 0:
            raise ValueError(f"d_model ({v}) must be divisible by n_heads ({n_heads})")
        return v

class TrainingConfig(BaseModel, frozen=True):
    lr: float = Field(default=1e-4, ge=1e-7, le=1.0)
    weight_decay: float = Field(default=0.01, ge=0.0)
    batch_size: int = Field(default=32, ge=1, le=2048)
    max_epochs: int = Field(default=100, ge=1)
    precision: PrecisionType = "bf16-mixed"
    accumulate_grad_batches: int = Field(default=1, ge=1)
    gradient_clip_val: float | None = Field(default=1.0, ge=0.0)
    seed: int = Field(default=42)

class DataConfig(BaseModel, frozen=True):
    num_workers: int = Field(default=4, ge=0, le=64)
    pin_memory: bool = True
    persistent_workers: bool = True
    prefetch_factor: int = Field(default=2, ge=1)
    streaming: bool = Field(default=False, description="Enable memory-mapped streaming mode")

class InfraConfig(BaseModel, frozen=True):
    slurm_partition: str = Field(
        default_factory=lambda: __import__("os").environ.get("SLURM_PARTITION", "learnlab")
    )
    gpus_per_node: int = Field(default=1, ge=0, le=8)
    save_path: Path = Field(default=Path("checkpoints"))
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"

class TribeConfig(BaseModel, frozen=True):
    model: ModelConfig = Field(default_factory=ModelConfig)
    training: TrainingConfig = Field(default_factory=TrainingConfig)
    data: DataConfig = Field(default_factory=DataConfig)
    infra: InfraConfig = Field(default_factory=InfraConfig)

    @classmethod
    def from_yaml(cls, path: str | Path) -> TribeConfig:
        import yaml
        with open(path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
        return cls(**data)

    def to_yaml(self, path: str | Path) -> None:
        import yaml
        with open(path, "w", encoding="utf-8") as f:
            yaml.dump(self.model_dump(), f, default_flow_style=False)
