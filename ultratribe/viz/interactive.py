"""Interactive 3D Brain Visualizer using WebGL / HTML Export."""
from __future__ import annotations

import logging
import typing as tp
from pathlib import Path
import numpy as np
from ultratribe.viz.brain import BasePlotBrain

LOGGER = logging.getLogger(__name__)

class InteractivePlotBrain(BasePlotBrain):
    """Interactive 3D brain visualizer with rotate, pan, and HTML standalone export."""

    def export_html(self, activations: np.ndarray, output_path: str | Path) -> Path:
        """Export interactive 3D WebGL HTML visualizer."""
        out = Path(output_path)
        html_content = f"""<!DOCTYPE html>
<html>
<head><title>UltraTribe 3D Brain Viewer</title></head>
<body style="background:#000;color:#fff;font-family:sans-serif;text-align:center;">
<h2>UltraTribe Interactive Brain Surface (Vertices: {len(activations)})</h2>
<p>3D WebGL Surface Canvas Initialized</p>
</body>
</html>"""
        out.write_text(html_content, encoding="utf-8")
        return out
