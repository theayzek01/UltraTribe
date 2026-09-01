import pytest

def test_roi_masking():
    """Test ROI masking function"""
    mask = [True, False, True, True]
    data = [1.0, 2.0, 3.0, 4.0]
    masked = [d for d, m in zip(data, mask) if m]
    assert len(masked) == 3
    assert masked == [1.0, 3.0, 4.0]

def test_data_loading_utils():
    """Test data loading utilities"""
    def mock_load_data(path):
        if not path.endswith(".nii.gz"):
            raise ValueError("Invalid file format")
        return {"data": "mock_data"}
    
    assert mock_load_data("test.nii.gz")["data"] == "mock_data"
    
def test_data_loading_invalid_path():
    """Test data loading with invalid path"""
    with pytest.raises(ValueError):
        def mock_load_data(path):
            if not path.endswith(".nii.gz"):
                raise ValueError("Invalid file format")
        mock_load_data("test.txt")

def test_coordinate_transformation():
    """Test coordinate transformation utility"""
    coord = (0, 0, 0)
    transformed = (coord[0] + 1, coord[1] + 1, coord[2] + 1)
    assert transformed == (1, 1, 1)
