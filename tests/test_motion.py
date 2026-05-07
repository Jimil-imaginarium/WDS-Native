"""Unit tests for HandMotionTracker — wrist motion via 10-frame deque."""
from vision import HandMotionTracker, StationMotion


def test_initial_state_not_moving():
    """A fresh tracker with no points has no history → not moving."""
    t = HandMotionTracker()
    assert t.is_moving() is False


def test_single_point_not_moving():
    """One point isn't enough — needs at least 3."""
    t = HandMotionTracker()
    t.update(100, 100)
    assert t.is_moving() is False


def test_two_points_not_moving():
    """Two points still below the 3-sample minimum."""
    t = HandMotionTracker()
    t.update(100, 100)
    t.update(200, 200)
    assert t.is_moving() is False


def test_stationary_below_threshold():
    """Hand stays in place across many frames → distance 0 → not moving."""
    t = HandMotionTracker()
    for _ in range(10):
        t.update(100, 100)
    assert t.is_moving() is False


def test_small_drift_below_threshold():
    """Distance from oldest to newest is 5 px (< 8 px threshold) → not moving."""
    t = HandMotionTracker(threshold_px=8)
    for x in range(100, 106):           # 100, 101, 102, 103, 104, 105
        t.update(x, 100)
    # distance = newest(105) - oldest(100) = 5  → not moving
    assert t.is_moving() is False


def test_motion_above_threshold_horizontal():
    """Horizontal motion >= 8 px → moving."""
    t = HandMotionTracker(threshold_px=8)
    for x in [100, 102, 104, 106, 108, 110, 112]:
        t.update(x, 100)
    # oldest=100, newest=112, distance=12 ≥ 8
    assert t.is_moving() is True


def test_motion_diagonal():
    """Diagonal motion uses Euclidean distance (sqrt(dx² + dy²))."""
    t = HandMotionTracker(threshold_px=8)
    t.update(100, 100)
    t.update(105, 105)
    t.update(110, 110)
    # dx=10, dy=10 → distance = sqrt(200) ≈ 14.14 ≥ 8
    assert t.is_moving() is True


def test_motion_oldest_drops_off_after_history_size():
    """After history_size+ updates, the oldest sample drops out of the window."""
    t = HandMotionTracker(history_size=5, threshold_px=8)
    # Fill history, then add a 6th — first sample falls off
    points = [(0, 0), (5, 0), (10, 0), (15, 0), (20, 0), (25, 0)]
    for p in points:
        t.update(*p)
    # window = last 5 points = [(5,0)…(25,0)]; oldest=5, newest=25, distance=20 ≥ 8
    assert t.is_moving() is True


def test_threshold_inclusive():
    """Distance == threshold counts as moving (>= comparison)."""
    t = HandMotionTracker(threshold_px=8)
    t.update(0, 0)
    t.update(4, 0)
    t.update(8, 0)
    # distance from (0,0) to (8,0) = 8, threshold = 8 → moving (>= )
    assert t.is_moving() is True


# ── StationMotion (multi-track wrapper) ─────────────────────────────
def test_station_motion_independent_tracks():
    """Different keys must be tracked independently."""
    sm = StationMotion()
    # Track A: stationary
    for _ in range(10):
        sm.update("Left", 100, 100)
    # Track B: moving
    for x in range(100, 120, 2):
        sm.update("Right", x, 100)

    # Last call of A returns False, B returns True
    a_moving = sm.update("Left", 100, 100)
    b_moving = sm.update("Right", 130, 100)
    assert a_moving is False
    assert b_moving is True


def test_station_motion_prune_drops_unused_keys():
    """Keys not in the keep-set should be removed."""
    sm = StationMotion()
    sm.update("Left", 100, 100)
    sm.update("Right", 200, 200)
    sm.prune({"Left"})   # keep only Left
    assert "Left"  in sm.trackers
    assert "Right" not in sm.trackers
