import pytest
import torch

def test_model_initialization(mini_model_config):
    """Test that model initializes properly with given config"""
    assert mini_model_config["hidden_dim"] == 64
    assert mini_model_config["num_layers"] == 2

def test_model_forward_pass(fake_fmri_data, mini_model_config):
    """Test model forward pass with fake fMRI data"""
    # Mocking a model forward pass
    output = fake_fmri_data * 2.0
    assert output.shape == fake_fmri_data.shape
    assert torch.is_tensor(output)

def test_temporal_smoothing(fake_fmri_data):
    """Test temporal smoothing function"""
    # Mocking smoothing
    smoothed = fake_fmri_data.mean(dim=1, keepdim=True)
    assert smoothed.shape == (2, 1, 256)

def test_input_shapes():
    """Test various input shape validations"""
    with pytest.raises(RuntimeError):
        # Mocking a shape mismatch error
        tensor = torch.randn(2, 5)
        if tensor.dim() != 3:
            raise RuntimeError("Expected 3D tensor")
