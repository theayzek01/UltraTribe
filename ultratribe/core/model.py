"""UltraTribe v4.0.0 — Core Neural Encoding Architecture."""
from __future__ import annotations

import logging
import typing as tp
import torch
import torch.nn as nn
from torch import Tensor

LOGGER = logging.getLogger(__name__)

class TemporalSmoothing(nn.Module):
    """Temporal smoothing using 1D convolution with optional Gaussian kernel."""
    def __init__(self, dim: int, kernel_size: int = 5, sigma: float = 1.0) -> None:
        super().__init__()
        self.conv = nn.Conv1d(dim, dim, kernel_size, padding=kernel_size // 2, groups=dim, bias=False)
        # Initialize with Gaussian weights
        x = torch.arange(kernel_size) - kernel_size // 2
        kernel = torch.exp(-0.5 * (x / sigma) ** 2)
        kernel = kernel / kernel.sum()
        kernel = kernel.repeat(dim, 1, 1)
        self.conv.weight.data = kernel
        self.conv.requires_grad = False

    def forward(self, x: Tensor) -> Tensor:
        # x: (B, D, T)
        return self.conv(x)

class FmriEncoderModel(nn.Module):
    """High-performance multi-modal neural encoding model for cortical fMRI."""

    def __init__(
        self,
        config: dict[str, tp.Any] | tp.Any,
        n_outputs: int = 20484,
        n_output_timesteps: int | None = None,
    ) -> None:
        super().__init__()
        if hasattr(config, "model_dump"):
            self.cfg = config.model_dump()
        elif isinstance(config, dict):
            self.cfg = config
        else:
            self.cfg = getattr(config, "__dict__", {})

        self.feature_dims: dict[str, int] = self.cfg.get("feature_dims", {"video": 64, "audio": 32})
        self.hidden: int = self.cfg.get("hidden", self.cfg.get("d_model", 256))
        self.n_outputs: int = n_outputs
        self.n_output_timesteps: int | None = n_output_timesteps
        self.max_seq_len: int = self.cfg.get("max_seq_len", 1024)
        self.temporal_dropout_rate: float = self.cfg.get("temporal_dropout", 0.0)
        self.modality_dropout_rate: float = self.cfg.get("modality_dropout", 0.0)

        # 1. Input Projectors for each modality
        self.projectors = nn.ModuleDict()
        n_mods = max(1, len(self.feature_dims))
        out_proj_dim = self.hidden // n_mods

        for mod, dim in self.feature_dims.items():
            in_dim = dim[1] if isinstance(dim, tuple) else dim
            self.projectors[mod] = nn.Sequential(
                nn.Linear(in_dim, out_proj_dim),
                nn.LayerNorm(out_proj_dim),
                nn.GELU(),
            )

        # 2. Embeddings
        self.time_pos_embed = nn.Parameter(torch.randn(1, self.max_seq_len, self.hidden) * 0.02)
        n_subjects = self.cfg.get("n_subjects", 10)
        self.subject_embed = nn.Embedding(n_subjects, self.hidden)

        # 3. Transformer Encoder
        n_heads = self.cfg.get("n_heads", 8)
        n_layers = self.cfg.get("n_layers", 4)
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=self.hidden,
            nhead=n_heads,
            dim_feedforward=self.hidden * 4,
            dropout=self.cfg.get("attn_dropout", 0.1),
            activation="gelu",
            batch_first=True,
            norm_first=True,
        )
        self.encoder = nn.TransformerEncoder(encoder_layer, num_layers=n_layers)

        # 4. Output Predictor Head
        low_rank = self.cfg.get("low_rank_head", None)
        if low_rank:
            self.head = nn.Sequential(
                nn.Linear(self.hidden, low_rank, bias=False),
                nn.Linear(low_rank, self.n_outputs),
            )
        else:
            self.head = nn.Linear(self.hidden, self.n_outputs)

        if self.n_output_timesteps:
            self.pooler = nn.AdaptiveAvgPool1d(self.n_output_timesteps)
        else:
            self.pooler = None

    def compile(self, **kwargs: tp.Any) -> FmriEncoderModel:
        """JIT compile model with PyTorch 2.x torch.compile for maximum kernel fusion."""
        return torch.compile(self, **kwargs)  # type: ignore[return-value]

    def aggregate_features(self, batch_data: dict[str, Tensor]) -> Tensor:
        """Fast vectorized multi-modal feature projection and aggregation."""
        tensors: list[Tensor] = []
        B, T = 1, 1

        for mod, proj in self.projectors.items():
            if mod in batch_data:
                x = batch_data[mod]
                B, T = x.shape[0], x.shape[1]
                feat = proj(x)  # (B, T, out_proj_dim)
                if self.training and self.modality_dropout_rate > 0:
                    mask = (torch.rand(B, 1, 1, device=x.device) >= self.modality_dropout_rate).float()
                    feat = feat * mask
                tensors.append(feat)

        if not tensors:
            device = next(self.parameters()).device
            return torch.zeros(B, T, self.hidden, device=device)

        # Concatenate along feature dimension -> (B, T, hidden)
        out = torch.cat(tensors, dim=-1)

        # Vectorized temporal dropout with masked_fill
        if self.training and self.temporal_dropout_rate > 0:
            drop_mask = torch.rand(B, T, 1, device=out.device) < self.temporal_dropout_rate
            out = out.masked_fill(drop_mask, 0.0)

        return out

    def forward(self, batch: dict[str, Tensor] | tp.Any) -> Tensor:
        data = batch if isinstance(batch, dict) else getattr(batch, "data", {})
        x = self.aggregate_features(data)  # (B, T, hidden)
        B, T, _ = x.shape

        # Positional & Subject embedding
        x = x + self.time_pos_embed[:, :T, :]
        if "subject_id" in data:
            s_id = data["subject_id"]
            if s_id.ndim == 1:
                x = x + self.subject_embed(s_id).unsqueeze(1)

        # Fast Attention Transformer Forward
        with torch.backends.cuda.sdp_kernel(enable_flash=True, enable_math=True, enable_mem_efficient=True):
            h = self.encoder(x)  # (B, T, hidden)

        # Output projection -> (B, T, n_outputs)
        out = self.head(h)

        # Transpose to (B, n_outputs, T) for fMRI surface compatibility
        out = out.transpose(1, 2)

        if self.pooler is not None:
            out = self.pooler(out)

        return out
