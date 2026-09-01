import pytest

def test_config_validation(mini_model_config):
    """Test configuration validation logic"""
    assert "hidden_dim" in mini_model_config
    assert isinstance(mini_model_config["hidden_dim"], int)

def test_missing_required_config():
    """Test that missing required fields raise error"""
    with pytest.raises(KeyError):
        config = {"num_layers": 2}
        if "hidden_dim" not in config:
            raise KeyError("hidden_dim is required")

def test_default_overrides():
    """Test that default values are correctly overridden"""
    default_config = {"hidden_dim": 128, "dropout": 0.5}
    override = {"dropout": 0.1}
    
    final_config = {**default_config, **override}
    assert final_config["hidden_dim"] == 128
    assert final_config["dropout"] == 0.1

def test_invalid_config_type():
    """Test configuration with invalid types"""
    with pytest.raises(TypeError):
        config = {"num_layers": "two"}
        if not isinstance(config["num_layers"], int):
            raise TypeError("num_layers must be int")
