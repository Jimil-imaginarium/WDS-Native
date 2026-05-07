"""Unit tests for ActivityClassifier — the 6-frame hysteresis state machine.

State rules:
  CAMERA_LOST  ⇔  stream_alive == False                            (immediate)
  NO_WORKER    ⇔  hands_in_roi == 0                                 (immediate)
  ACTIVE       ⇔  any_holding_grip AND any_hand_moving              (after 6 frames)
  IDLE         ⇔  hand visible but not holding-and-moving           (after 6 frames)

ACTIVE↔IDLE transitions require 6 consecutive same-raw-state frames before
the displayed state flips. CAMERA_LOST and NO_WORKER are unconditional.
"""
from vision import ActivityClassifier, State


def _all_active_args():
    return dict(stream_alive=True, hands_in_roi=1,
                any_holding_grip=True, any_hand_moving=True)


def _all_idle_args():
    return dict(stream_alive=True, hands_in_roi=1,
                any_holding_grip=True, any_hand_moving=False)


def _no_worker_args():
    return dict(stream_alive=True, hands_in_roi=0,
                any_holding_grip=False, any_hand_moving=False)


# ─────────────────────────────────────────────────────────────────
# Immediate transitions (no hysteresis)
# ─────────────────────────────────────────────────────────────────
def test_camera_lost_immediate():
    c = ActivityClassifier()
    s = c.step(stream_alive=False, hands_in_roi=2,
               any_holding_grip=True, any_hand_moving=True)
    assert s == State.CAMERA_LOST


def test_no_worker_immediate():
    c = ActivityClassifier()
    s = c.step(**_no_worker_args())
    assert s == State.NO_WORKER


def test_camera_lost_overrides_active_history():
    """Even after building up an ACTIVE state, losing the camera flips immediately."""
    c = ActivityClassifier(smooth_frames=6)
    for _ in range(6):
        c.step(**_all_active_args())
    assert c.displayed == State.ACTIVE

    s = c.step(stream_alive=False, hands_in_roi=1,
               any_holding_grip=True, any_hand_moving=True)
    assert s == State.CAMERA_LOST


# ─────────────────────────────────────────────────────────────────
# 6-frame hysteresis
# ─────────────────────────────────────────────────────────────────
def test_active_requires_6_frames_to_flip():
    """Initial state is NO_WORKER; ACTIVE-raw must persist 6 frames before display flips."""
    c = ActivityClassifier(smooth_frames=6)
    # First 5 frames: raw flips to ACTIVE but displayed stays NO_WORKER
    for i in range(5):
        s = c.step(**_all_active_args())
        assert s == State.NO_WORKER, f"frame {i+1}: expected NO_WORKER, got {s}"
    # 6th consecutive ACTIVE-raw frame: streak >= 6 → flip
    s = c.step(**_all_active_args())
    assert s == State.ACTIVE


def test_idle_to_active_transition():
    """From displayed=IDLE, ACTIVE requires 6 consecutive ACTIVE-raw frames."""
    c = ActivityClassifier(smooth_frames=6)
    # Build up to displayed=IDLE
    for _ in range(6):
        c.step(**_all_idle_args())
    assert c.displayed == State.IDLE

    # 5 ACTIVE-raw frames not enough
    for i in range(5):
        s = c.step(**_all_active_args())
        assert s == State.IDLE, f"frame {i+1}: expected IDLE, got {s}"
    # 6th flips
    s = c.step(**_all_active_args())
    assert s == State.ACTIVE


def test_single_noisy_frame_does_not_flip():
    """One stray ACTIVE-raw amid IDLE-raw frames must not flip displayed."""
    c = ActivityClassifier(smooth_frames=6)
    # Build up to ACTIVE
    for _ in range(6):
        c.step(**_all_active_args())
    assert c.displayed == State.ACTIVE

    # One IDLE-raw frame — streak resets but displayed stays ACTIVE
    s = c.step(**_all_idle_args())
    assert s == State.ACTIVE  # one bad frame doesn't flip

    # Back to ACTIVE for 4 more — still displayed ACTIVE
    for _ in range(4):
        s = c.step(**_all_active_args())
        assert s == State.ACTIVE


# ─────────────────────────────────────────────────────────────────
# Reentry from NO_WORKER
# ─────────────────────────────────────────────────────────────────
def test_no_worker_resets_streak():
    """NO_WORKER zeros the streak so re-entering ACTIVE again takes 6 frames."""
    c = ActivityClassifier(smooth_frames=6)
    # 3 ACTIVE frames (streak builds but doesn't flip)
    for _ in range(3):
        c.step(**_all_active_args())
    # NO_WORKER frame resets
    c.step(**_no_worker_args())
    # Now ACTIVE for 5 more — should still be NO_WORKER (streak rebuilds from 1)
    for i in range(5):
        s = c.step(**_all_active_args())
        assert s == State.NO_WORKER, f"frame {i+1}: expected NO_WORKER, got {s}"
    # 6th flips
    s = c.step(**_all_active_args())
    assert s == State.ACTIVE
