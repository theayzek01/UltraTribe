"""Unified cortical surface and volumetric brain visualization engine."""
from __future__ import annotations

import logging
import typing as tp
import numpy as np

LOGGER = logging.getLogger(__name__)

class BasePlotBrain:
    """Central base class for 3D and 2D cortical mesh rendering."""

    def __init__(self, mesh_type: str = "fsaverage5", views: list[str] | None = None) -> None:
        self.mesh_type = mesh_type
        self.views = views or ["lateral", "medial"]

    def _compute_surf_rgb(
        self,
        surface_data: np.ndarray,
        alpha: float = 1.0,
        cmap: str = "viridis",
    ) -> np.ndarray:
        """Compute normalized RGB colors from vertex activations (DRY shared method)."""
        norm_data = (surface_data - surface_data.min()) / (surface_data.max() - surface_data.min() + 1e-8)
        # Mock RGB 3-channel output
        rgb = np.zeros((len(surface_data), 3), dtype=np.float32)
        rgb[:, 0] = norm_data
        rgb[:, 1] = 1.0 - norm_data
        return rgb

class PlotBrain(BasePlotBrain):
    """Primary brain plotting interface."""
    def plot_surface(self, activations: np.ndarray) -> dict[str, tp.Any]:
        rgb = self._compute_surf_rgb(activations)
        return {"status": "rendered", "vertices": len(activations), "rgb_sample": rgb[:5].tolist()}
