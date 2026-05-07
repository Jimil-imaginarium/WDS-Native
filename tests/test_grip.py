"""Unit tests for classify_grip — the core grip-taxonomy classifier.

Synthesizes 21-point landmark arrays with controlled MCP-PIP-DIP angles per
finger and asserts the returned Grip enum matches the expected category.

Convention recap (see vision.py):
   angle 0°   → DIP folded back near MCP   → "curled"   (< 35°)
   angle 50°  → mid-bend                   → "semi"     (35°-77°)
   angle 180° → DIP straight from MCP      → "extended" (≥ 77°)

Grip taxonomy:
   POWER   ⇔ ≥3 non-thumb fingers curled/semi  AND  thumb curled/semi
   HOOK    ⇔ ≥3 non-thumb fingers curled/semi  AND  thumb extended
   PINCH   ⇔ index curled/semi  AND  thumb curled/semi  AND  ≤2 other non-thumb
   OPEN    ⇔ 0 non-thumb curled  AND  thumb extended
   RELAXED ⇔ anything else
"""
from __future__ import annotations

import math

import pytest

from vision import (
    Grip, classify_grip,
    THUMB_MCP, THUMB_IP, THUMB_TIP,
    INDEX_MCP, INDEX_PIP, INDEX_DIP, INDEX_TIP,
    MIDDLE_MCP, MIDDLE_PIP, MIDDLE_DIP, MIDDLE_TIP,
    RING_MCP, RING_PIP, RING_DIP, RING_TIP,
    PINKY_MCP, PINKY_PIP, PINKY_DIP, PINKY_TIP,
)


# ─────────────────────────────────────────────────────────────────────
# Synthetic landmark builder
# ─────────────────────────────────────────────────────────────────────
def _three_pts(mcp_xy: tuple[int, int], theta_deg: float, scale: int = 100):
    """Returns (MCP, PIP, DIP) such that the angle at PIP between MCP and DIP equals theta_deg.

    Geometric reasoning: place MCP at origin, PIP at +x. Then DIP direction from
    PIP is rotated by (180° - theta) from +x, where theta is the desired angle.
    """
    mx, my = mcp_xy
    pip = (mx + scale, my)
    alpha = math.radians(180.0 - theta_deg)
    dip_x = pip[0] + scale * math.cos(alpha)
    dip_y = pip[1] + scale * math.sin(alpha)
    return mcp_xy, pip, (int(round(dip_x)), int(round(dip_y)))


def _make_landmarks(thumb_deg, index_deg, middle_deg, ring_deg, pinky_deg):
    """Build a 21-landmark array with the given curl angle at each finger's PIP/IP joint."""
    lm: list[tuple[int, int]] = [(0, 0)] * 21

    finger_specs = [
        # (mcp_idx,    pip_idx,    dip_idx,    tip_idx,    mcp_xy,     theta)
        (THUMB_MCP,   THUMB_IP,   THUMB_TIP,  THUMB_TIP,  (100, 200), thumb_deg),
        (INDEX_MCP,   INDEX_PIP,  INDEX_DIP,  INDEX_TIP,  (400, 200), index_deg),
        (MIDDLE_MCP,  MIDDLE_PIP, MIDDLE_DIP, MIDDLE_TIP, (700, 200), middle_deg),
        (RING_MCP,    RING_PIP,   RING_DIP,   RING_TIP,   (1000, 200), ring_deg),
        (PINKY_MCP,   PINKY_PIP,  PINKY_DIP,  PINKY_TIP,  (1300, 200), pinky_deg),
    ]
    for mcp_idx, pip_idx, dip_idx, tip_idx, mcp_xy, theta in finger_specs:
        mcp, pip, dip = _three_pts(mcp_xy, theta)
        lm[mcp_idx] = mcp
        lm[pip_idx] = pip
        lm[dip_idx] = dip
        lm[tip_idx] = dip   # tip == dip: doesn't affect classification
    return lm


# ─────────────────────────────────────────────────────────────────────
# Sanity tests on the synthetic helper
# ─────────────────────────────────────────────────────────────────────
def test_three_pts_extended():
    """θ = 180° → MCP, PIP, DIP collinear with PIP between."""
    mcp, pip, dip = _three_pts((0, 0), 180.0)
    assert mcp == (0, 0)
    assert pip == (100, 0)
    assert dip == (200, 0)


def test_three_pts_curled():
    """θ = 0° → DIP folded back to MCP position."""
    _, _, dip = _three_pts((0, 0), 0.0)
    assert dip == (0, 0)


# ─────────────────────────────────────────────────────────────────────
# classify_grip — invalid input
# ─────────────────────────────────────────────────────────────────────
def test_unknown_when_too_few_landmarks():
    grip, curls = classify_grip([(0, 0)] * 10)
    assert grip == Grip.UNKNOWN
    assert curls == []


def test_unknown_when_empty():
    grip, curls = classify_grip([])
    assert grip == Grip.UNKNOWN


# ─────────────────────────────────────────────────────────────────────
# classify_grip — each grip type
# ─────────────────────────────────────────────────────────────────────
def test_power_grip():
    """All fingers curled (closed fist) — thumb curled too."""
    lm = _make_landmarks(thumb_deg=20, index_deg=20, middle_deg=20, ring_deg=20, pinky_deg=20)
    grip, _ = classify_grip(lm)
    assert grip == Grip.POWER


def test_hook_grip():
    """≥3 non-thumb fingers curled AND thumb extended (hook around something)."""
    lm = _make_landmarks(thumb_deg=180, index_deg=20, middle_deg=20, ring_deg=20, pinky_deg=20)
    grip, _ = classify_grip(lm)
    assert grip == Grip.HOOK


def test_pinch_grip():
    """Index + thumb curled, others extended (pinching a small object)."""
    lm = _make_landmarks(thumb_deg=20, index_deg=20, middle_deg=180, ring_deg=180, pinky_deg=180)
    grip, _ = classify_grip(lm)
    assert grip == Grip.PINCH


def test_open_hand():
    """All fingers extended including thumb."""
    lm = _make_landmarks(thumb_deg=180, index_deg=180, middle_deg=180, ring_deg=180, pinky_deg=180)
    grip, _ = classify_grip(lm)
    assert grip == Grip.OPEN


def test_relaxed_two_fingers_curled():
    """Only 2 non-thumb curled (ring+pinky) → not enough for HOOK/POWER, not PINCH/OPEN → RELAXED."""
    lm = _make_landmarks(thumb_deg=180, index_deg=180, middle_deg=180, ring_deg=20, pinky_deg=20)
    grip, _ = classify_grip(lm)
    assert grip == Grip.RELAXED


def test_relaxed_only_thumb_curled():
    """Only thumb curled, others extended → not OPEN (thumb not extended), not PINCH (index extended) → RELAXED."""
    lm = _make_landmarks(thumb_deg=20, index_deg=180, middle_deg=180, ring_deg=180, pinky_deg=180)
    grip, _ = classify_grip(lm)
    assert grip == Grip.RELAXED


# ─────────────────────────────────────────────────────────────────────
# Curl angles array
# ─────────────────────────────────────────────────────────────────────
def test_curl_angles_returned_in_thumb_to_pinky_order():
    """The 5-element curl array must follow the order: thumb, index, middle, ring, pinky."""
    lm = _make_landmarks(thumb_deg=20, index_deg=180, middle_deg=180, ring_deg=180, pinky_deg=180)
    _, curls = classify_grip(lm)
    assert len(curls) == 5
    # thumb (idx 0) should be near 20, index (idx 1) near 180
    assert curls[0] < 35.0, f"thumb angle expected near 20°, got {curls[0]}"
    assert curls[1] > 77.0, f"index angle expected near 180°, got {curls[1]}"
