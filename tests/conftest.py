import pytest
import torch

@pytest.fixture
def fake_fmri_data():
    """Returns fake fMRI data tensor (B, T, C)"""
    return torch.randn(2, 10, 256)

@pytest.fixture
def mini_model_config():
    """Returns a mini configuration dictionary for the model"""
    return {
        "hidden_dim": 64,
        "num_layers": 2,
        "num_heads": 4,
        "dropout": 0.1,
    }

@pytest.fixture
def fake_event_data():
    """Returns fake event data"""
    return [{"onset": 0.5, "duration": 2.0, "label": "stimulus"}]
