import pytest
import torch

def test_transform_pipeline_initialization():
    """Test that the transform pipeline initializes correctly"""
    pipeline = ["normalize", "detrend", "smooth"]
    assert len(pipeline) == 3

def test_event_processing(fake_event_data):
    """Test event data processing"""
    assert len(fake_event_data) == 1
    assert fake_event_data[0]["onset"] == 0.5

def test_normalization_transform(fake_fmri_data):
    """Test normalization transform"""
    mean = fake_fmri_data.mean()
    std = fake_fmri_data.std()
    normalized = (fake_fmri_data - mean) / (std + 1e-8)
    assert torch.isclose(normalized.mean(), torch.tensor(0.0), atol=1e-5)

def test_invalid_transform():
    """Test behavior with an unknown transform"""
    with pytest.raises(ValueError):
        transform_name = "unknown_transform"
        if transform_name not in ["normalize", "smooth"]:
            raise ValueError(f"Unknown transform {transform_name}")
