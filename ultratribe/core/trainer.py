"""PyTorch Lightning Training Module for UltraTribe."""
from __future__ import annotations

import logging
import typing as tp
import torch
import torch.nn as nn
from ultratribe.core.model import FmriEncoderModel

LOGGER = logging.getLogger(__name__)

class BrainModule:
    """Enterprise PyTorch training orchestrator for UltraTribe models."""

    def __init__(
        self,
        model: FmriEncoderModel,
        lr: float = 1e-4,
        weight_decay: float = 0.01,
        precision: str = "bf16-mixed",
    ) -> None:
        self.model = model
        self.lr = lr
        self.weight_decay = weight_decay
        self.precision = precision
        self.criterion = nn.MSELoss()
        self.optimizer = torch.optim.AdamW(
            self.model.parameters(),
            lr=self.lr,
            weight_decay=self.weight_decay,
        )

    def training_step(self, batch: dict[str, torch.Tensor], target: torch.Tensor) -> float:
        self.model.train()
        self.optimizer.zero_grad()
        
        preds = self.model(batch)
        loss = self.criterion(preds, target)
        loss.backward()
        self.optimizer.step()
        
        return float(loss.item())

    @torch.inference_mode()
    def evaluate(self, batch: dict[str, torch.Tensor], target: torch.Tensor) -> float:
        self.model.eval()
        preds = self.model(batch)
        loss = self.criterion(preds, target)
        return float(loss.item())
