"""Pure functional utilities with no side effects for UltraTribe."""
from __future__ import annotations

import typing as tp
import torch
from torch import Tensor

def batched_apply(fn: tp.Callable[[Tensor], Tensor], x: Tensor, chunk_size: int = 64) -> Tensor:
    """Apply a function in chunks along dim=0 to prevent VRAM OOM spikes."""
    if x.shape[0] <= chunk_size:
        return fn(x)
    return torch.cat([fn(chunk) for chunk in x.split(chunk_size, dim=0)], dim=0)

def safe_normalize(x: Tensor, dim: int = -1, eps: float = 1e-8) -> Tensor:
    """L2 normalize tensor safely with epsilon avoiding zero division."""
    return x / (x.norm(dim=dim, keepdim=True) + eps)

def cosine_similarity_matrix(a: Tensor, b: Tensor) -> Tensor:
    """Pairwise cosine similarity matrix computation."""
    a_norm = safe_normalize(a)
    b_norm = safe_normalize(b)
    return a_norm @ b_norm.transpose(-2, -1)

def temporal_interpolate(x: Tensor, target_len: int) -> Tensor:
    """Interpolate temporal sequence length along the last dimension."""
    if x.shape[-1] == target_len:
        return x
    orig_shape = x.shape
    x_2d = x.reshape(-1, orig_shape[-1]).unsqueeze(1)
    res = torch.nn.functional.interpolate(x_2d, size=target_len, mode="linear", align_corners=False)
    return res.squeeze(1).reshape(*orig_shape[:-1], target_len)

def chunk_with_overlap(x: Tensor, chunk_size: int, overlap: int = 0) -> list[Tensor]:
    """Slice tensor into overlapping window chunks."""
    step = max(1, chunk_size - overlap)
    return [x[i : i + chunk_size] for i in range(0, max(1, x.shape[0] - overlap), step)]

def mean_pool_temporal(x: Tensor, pool_size: int) -> Tensor:
    """Adaptive 1D average pooling along temporal dimension."""
    return torch.nn.functional.adaptive_avg_pool1d(x, pool_size)

def zscore_normalize(x: Tensor, dim: int = -1, eps: float = 1e-8) -> Tensor:
    """Z-score standardize tensor along specified dimension."""
    mean = x.mean(dim=dim, keepdim=True)
    std = x.std(dim=dim, keepdim=True) + eps
    return (x - mean) / std
