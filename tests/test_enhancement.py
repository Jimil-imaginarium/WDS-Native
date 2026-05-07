"""Unit tests for apply_enhancement — the 4 image-enhancement modes.

For each mode, verifies the output frame:
  - has the same shape as input
  - has dtype uint8
  - is not None (function never silently returns garbage)

We also verify that "off" returns the input unchanged (passthrough).
"""
import numpy as np
import pytest

from vision import apply_enhancement


@pytest.fixture
def random_frame():
    """A 480×640 BGR uint8 frame with realistic-ish values."""
    rng = np.random.default_rng(seed=42)
    return rng.integers(low=0, high=256, size=(480, 640, 3), dtype=np.uint8)


@pytest.fixture
def dark_frame():
    """A dim frame to exercise auto_gamma (mean luma well below 110)."""
    rng = np.random.default_rng(seed=7)
    return rng.integers(low=0, high=80, size=(480, 640, 3), dtype=np.uint8)


def test_off_returns_same_frame(random_frame):
    """Mode "off" must return the *same* numpy array (no copy)."""
    out = apply_enhancement(random_frame, "off")
    assert out is random_frame


def test_off_with_empty_string(random_frame):
    """Empty string and None also short-circuit to passthrough."""
    assert apply_enhancement(random_frame, "")    is random_frame
    assert apply_enhancement(random_frame, None)  is random_frame


def test_clahe_preserves_shape_and_dtype(random_frame):
    out = apply_enhancement(random_frame, "clahe")
    assert out is not None
    assert out.shape == random_frame.shape
    assert out.dtype == np.uint8


def test_auto_gamma_preserves_shape_and_dtype(dark_frame):
    out = apply_enhancement(dark_frame, "auto_gamma")
    assert out is not None
    assert out.shape == dark_frame.shape
    assert out.dtype == np.uint8


def test_auto_gamma_brightens_dark_frame(dark_frame):
    """Auto-gamma should pull a dim frame's mean luma up toward 110."""
    out = apply_enhancement(dark_frame, "auto_gamma")
    assert out.mean() > dark_frame.mean(), "auto_gamma should brighten a dark frame"


def test_stretch_preserves_shape_and_dtype(random_frame):
    out = apply_enhancement(random_frame, "stretch")
    assert out is not None
    assert out.shape == random_frame.shape
    assert out.dtype == np.uint8


def test_unknown_mode_falls_through(random_frame):
    """Unknown mode names should not error; function returns the frame unchanged."""
    out = apply_enhancement(random_frame, "bogus_mode_xyz")
    # apply_enhancement's else branch: returns frame unchanged
    assert out is random_frame


def test_none_frame_passes_through():
    """None frame must not crash."""
    assert apply_enhancement(None, "clahe") is None
    assert apply_enhancement(None, "off")   is None
