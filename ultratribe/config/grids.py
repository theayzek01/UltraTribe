"""Grid search and study sweep configurations."""
from __future__ import annotations

import os
from typing import Any

def get_cortical_grid() -> dict[str, list[Any]]:
    return {
        "model.hidden": [128, 256, 512],
        "model.n_layers": [4, 6, 8],
        "training.lr": [1e-4, 3e-4, 5e-4],
        "training.precision": ["bf16-mixed"],
    }

def get_subcortical_grid() -> dict[str, list[Any]]:
    return {
        "model.hidden": [128, 256],
        "model.low_rank_head": [64, 128],
        "training.lr": [1e-4, 3e-4],
    }
