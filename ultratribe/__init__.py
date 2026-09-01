"""UltraTribe v4.0.0 — Enterprise-Grade Neural Encoding Framework.

Multi-modal brain encoding at scale — from research to production.
"""
from __future__ import annotations

__version__ = "4.0.0"

from ultratribe.core.model import FmriEncoderModel
from ultratribe.core.trainer import BrainModule
from ultratribe.core.experiment import TribeExperiment
from ultratribe.config.schema import TribeConfig, ModelConfig, TrainingConfig
from ultratribe.demo import TribeModel

__all__ = [
    "FmriEncoderModel",
    "BrainModule",
    "TribeExperiment",
    "TribeConfig",
    "ModelConfig",
    "TrainingConfig",
    "TribeModel",
    "__version__",
]
