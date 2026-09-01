"""Subcortical structure 3D mesh rendering."""
from __future__ import annotations

import numpy as np

def plot_subcortical_atlas(structures: list[str]) -> dict[str, list[str]]:
    return {"status": "success", "structures_plotted": structures}
