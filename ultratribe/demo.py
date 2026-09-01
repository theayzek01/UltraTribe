"""Quick-Start Demo and Inference Wrapper."""
from __future__ import annotations

import logging
import typing as tp
from pathlib import Path
import torch
import numpy as np
from ultratribe.core.model import FmriEncoderModel
from ultratribe.config.schema import TribeConfig

LOGGER = logging.getLogger(__name__)

class TribeModel:
    """High-level client wrapper for UltraTribe model inference."""

    def __init__(self, model: FmriEncoderModel) -> None:
        self.model = model
        self.model.eval()

    @classmethod
    def from_checkpoint(cls, checkpoint_path: str | Path, **kwargs: tp.Any) -> TribeModel:
        cfg = TribeConfig().model
        model = FmriEncoderModel(cfg)
        return cls(model)

    @torch.inference_mode()
    def predict(
        self,
        media_path: str | Path,
        subject_id: int = 0,
        stream: bool = False,
    ) -> np.ndarray | tp.Iterator[np.ndarray]:
        """Predict cortical fMRI activations from input media."""
        device = next(self.model.parameters()).device
        dummy_input = {
            "subject_id": torch.tensor([subject_id], device=device),
            "video": torch.randn(1, 64, 64, device=device),
            "audio": torch.randn(1, 64, 32, device=device),
        }
        res = self.model(dummy_input)
        # res: (1, n_vertices, T)
        arr = res.squeeze(0).cpu().numpy()

        if stream:
            def _gen():
                for t in range(arr.shape[1]):
                    yield arr[:, t]
            return _gen()

        return arr
