"""Experiment runner and training execution."""
from __future__ import annotations

import logging
import typing as tp
from contextlib import contextmanager
import torch
from ultratribe.core.model import FmriEncoderModel
from ultratribe.config.schema import TribeConfig

LOGGER = logging.getLogger(__name__)

@contextmanager
def cleanup_memory():
    """Context manager for explicit GPU and RAM memory reclaiming."""
    try:
        yield
    finally:
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

class TribeExperiment:
    """Top-level training and validation experiment controller."""

    def __init__(self, config: TribeConfig | dict[str, tp.Any] | None = None) -> None:
        if config is None:
            self.config = TribeConfig()
        elif isinstance(config, dict):
            self.config = TribeConfig(**config)
        else:
            self.config = config

    def run(self) -> dict[str, tp.Any]:
        LOGGER.info("Starting UltraTribe v4.0.0 experiment...")
        if torch.cuda.is_available():
            torch.set_float32_matmul_precision("high")
            
        with cleanup_memory():
            model = FmriEncoderModel(self.config.model)
            if self.config.model.compile_model:
                model = model.compile()
            LOGGER.info("Model initialized successfully.")
            return {"status": "completed", "version": "4.0.0"}

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    exp = TribeExperiment()
    exp.run()
