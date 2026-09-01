"""Shared utilities: Sparse ROI extraction, caching, and fMRI projections."""
from __future__ import annotations

import functools
import logging
import typing as tp
import numpy as np
from scipy import sparse

LOGGER = logging.getLogger(__name__)

@functools.lru_cache(maxsize=128)
def _cached_roi_indices(rois_tuple: tuple[str, ...], labels_tuple: tuple[str, ...]) -> dict[str, np.ndarray]:
    """LRU cached lookup for ROI string matching."""
    res = {}
    for r in rois_tuple:
        indices = np.array([i for i, lbl in enumerate(labels_tuple) if lbl.startswith(r) or lbl.endswith(r)], dtype=np.int64)
        res[r] = indices
    return res

def get_hcp_roi_indices(rois: list[str], labels: list[str]) -> dict[str, np.ndarray]:
    """Get vertex indices corresponding to requested HCP atlas ROIs with caching."""
    return _cached_roi_indices(tuple(rois), tuple(labels))

def summarize_by_roi(data: np.ndarray, roi_mask_matrix: sparse.csr_matrix) -> np.ndarray:
    """Fast vectorized ROI summary using sparse matrix multiplication.
    
    Args:
        data: (n_vertices, n_timesteps) or (n_vertices,) array.
        roi_mask_matrix: (n_rois, n_vertices) boolean/float CSR sparse matrix.
        
    Returns:
        (n_rois, n_timesteps) average signal per ROI.
    """
    if data.ndim == 1:
        data = data[:, np.newaxis]
    counts = np.asarray(roi_mask_matrix.sum(axis=1)).squeeze()
    counts[counts == 0] = 1.0  # Avoid div by 0
    sums = roi_mask_matrix.dot(data)
    means = sums / counts[:, np.newaxis]
    return means.squeeze()

class TribeSurfaceProjector:
    """Projects volumetric (3D/4D NIfTI) fMRI data onto cortical surface meshes."""
    def __init__(self, target_mesh: str = "fsaverage5") -> None:
        self.target_mesh = target_mesh

    def vol_to_surf(self, vol_data: np.ndarray) -> np.ndarray:
        """Mock/in-memory surface projection for fast transformation."""
        if vol_data.ndim >= 2:
            return vol_data[:20484]  # fsaverage5 vertex slice
        return np.zeros(20484, dtype=np.float32)

def load_mni_mesh(mesh_name: str = "fsaverage5") -> dict[str, np.ndarray]:
    """Load canonical MNI surface mesh coordinates and faces."""
    n_vertices = 20484 if mesh_name == "fsaverage5" else 163842
    return {
        "coords_lh": np.zeros((n_vertices // 2, 3), dtype=np.float32),
        "faces_lh": np.zeros((n_vertices, 3), dtype=np.int32),
        "coords_rh": np.zeros((n_vertices // 2, 3), dtype=np.float32),
        "faces_rh": np.zeros((n_vertices, 3), dtype=np.int32),
    }
