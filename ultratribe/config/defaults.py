"""Default constants and hyperparameters for UltraTribe."""
from __future__ import annotations

import os

NEURO_OFFSET: float = 5.0
NEURO_FREQUENCY: float = 1.49
TR_DEFAULT: float = 1.49
TEXT_LAYERS: list[float] = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0]

DEFAULT_FSAVERAGE_VERTICES: int = 20484  # fsaverage5 standard resolution
DEFAULT_FSAVERAGE7_VERTICES: int = 163842

SLURM_PARTITION: str = os.environ.get("SLURM_PARTITION", "learnlab")
DATAPATH: str = os.environ.get("DATAPATH", "data")
SAVEPATH: str = os.environ.get("SAVEPATH", "checkpoints")
