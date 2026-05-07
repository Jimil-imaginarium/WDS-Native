"""WDS Vision — computer vision + per-station inference.

Self-contained: contains everything from the user's reference build
`handPoseDetection.py`, refactored into clean classes:

  - StreamReader       — MJPEG client with auto-discovery + reconnect
  - MediaPipeHands     — Tasks API wrapper, auto-downloads model
  - GripClassifier     — finger curl angles → 5-class grip taxonomy
  - HandMotionTracker  — wrist motion (oldest-vs-newest, 8 px threshold)
  - ActivityClassifier — 6-frame hysteresis state machine
  - apply_enhancement  — off / clahe / auto_gamma / stretch (4 modes)
  - StationWorker      — one thread per station; wraps the above
  - Orchestrator       — supervises workers, polls DB for new stations

Decision logic matches handPoseDetection.py exactly:
  ACTIVE  ⇔  (any holding-grip)  AND  (any hand moving)   [pose-only mode]
"""
from __future__ import annotations

import logging
import math
import os
import re
import threading
import time
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Callable
from urllib.parse import urljoin

import cv2
import numpy as np
import requests

log = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────
# Constants — ported from handPoseDetection.py
# ─────────────────────────────────────────────────────────────────────────
WRIST = 0
THUMB_CMC, THUMB_MCP, THUMB_IP, THUMB_TIP = 1, 2, 3, 4
INDEX_MCP, INDEX_PIP, INDEX_DIP, INDEX_TIP = 5, 6, 7, 8
MIDDLE_MCP, MIDDLE_PIP, MIDDLE_DIP, MIDDLE_TIP = 9, 10, 11, 12
RING_MCP, RING_PIP, RING_DIP, RING_TIP = 13, 14, 15, 16
PINKY_MCP, PINKY_PIP, PINKY_DIP, PINKY_TIP = 17, 18, 19, 20

HAND_CONNECTIONS = [
    (WRIST, THUMB_CMC), (THUMB_CMC, THUMB_MCP), (THUMB_MCP, THUMB_IP), (THUMB_IP, THUMB_TIP),
    (WRIST, INDEX_MCP), (INDEX_MCP, INDEX_PIP), (INDEX_PIP, INDEX_DIP), (INDEX_DIP, INDEX_TIP),
    (WRIST, MIDDLE_MCP), (MIDDLE_MCP, MIDDLE_PIP), (MIDDLE_PIP, MIDDLE_DIP), (MIDDLE_DIP, MIDDLE_TIP),
    (WRIST, RING_MCP), (RING_MCP, RING_PIP), (RING_PIP, RING_DIP), (RING_DIP, RING_TIP),
    (WRIST, PINKY_MCP), (PINKY_MCP, PINKY_PIP), (PINKY_PIP, PINKY_DIP), (PINKY_DIP, PINKY_TIP),
    (INDEX_MCP, MIDDLE_MCP), (MIDDLE_MCP, RING_MCP), (RING_MCP, PINKY_MCP),
]

FINGERS = {
    # (mcp, pip, dip, tip) — angle is computed at the second joint between the
    # first and third. The thumb has no DIP joint (it has CMC, MCP, IP, TIP) so
    # we use TIP in place of DIP — angle at IP between MCP and TIP.
    "thumb":  (THUMB_MCP, THUMB_IP, THUMB_TIP, THUMB_TIP),
    "index":  (INDEX_MCP, INDEX_PIP, INDEX_DIP, INDEX_TIP),
    "middle": (MIDDLE_MCP, MIDDLE_PIP, MIDDLE_DIP, MIDDLE_TIP),
    "ring":   (RING_MCP, RING_PIP, RING_DIP, RING_TIP),
    "pinky":  (PINKY_MCP, PINKY_PIP, PINKY_DIP, PINKY_TIP),
}

CURL_THRESHOLD_DEG = 35.0

DEFAULT_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/"
    "hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
)
DEFAULT_MODEL_PATH = "models/hand_landmarker.task"


# ─────────────────────────────────────────────────────────────────────────
# Geometry helpers
# ─────────────────────────────────────────────────────────────────────────
def angle_3pts_deg(a, b, c) -> float:
    bax, bay = a[0] - b[0], a[1] - b[1]
    bcx, bcy = c[0] - b[0], c[1] - b[1]
    dot = bax * bcx + bay * bcy
    mag = math.hypot(bax, bay) * math.hypot(bcx, bcy)
    if mag == 0:
        return 0.0
    return math.degrees(math.acos(max(-1.0, min(1.0, dot / mag))))


def iou(b1, b2) -> float:
    xi1, yi1 = max(b1[0], b2[0]), max(b1[1], b2[1])
    xi2, yi2 = min(b1[2], b2[2]), min(b1[3], b2[3])
    inter = max(0, xi2 - xi1) * max(0, yi2 - yi1)
    if inter == 0:
        return 0.0
    a1 = (b1[2] - b1[0]) * (b1[3] - b1[1])
    a2 = (b2[2] - b2[0]) * (b2[3] - b2[1])
    return inter / float(a1 + a2 - inter)


# ─────────────────────────────────────────────────────────────────────────
# Image enhancement (4 modes from handPoseDetection.py)
# ─────────────────────────────────────────────────────────────────────────
_clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
_stretch_state: dict = {"frame_idx": 0, "lut_b": None, "lut_g": None, "lut_r": None}


def _enhance_clahe(frame):
    lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    l = _clahe.apply(l)
    return cv2.cvtColor(cv2.merge((l, a, b)), cv2.COLOR_LAB2BGR)


def _enhance_auto_gamma(frame):
    b, g, r = cv2.split(frame.astype(np.float32))
    mean_b, mean_g, mean_r = b.mean(), g.mean(), r.mean()
    mean_gray = (mean_b + mean_g + mean_r) / 3.0
    if mean_b > 1 and mean_g > 1 and mean_r > 1:
        b *= mean_gray / mean_b
        g *= mean_gray / mean_g
        r *= mean_gray / mean_r
    bal = cv2.merge((np.clip(b, 0, 255), np.clip(g, 0, 255), np.clip(r, 0, 255))).astype(np.uint8)

    gray = cv2.cvtColor(bal, cv2.COLOR_BGR2GRAY)
    mean_l = float(gray.mean())
    if mean_l < 1:
        return bal
    # gamma derived so that x=mean_l maps to ~110: (mean_l/255)^gamma = 110/255
    gamma = math.log(110 / 255.0) / math.log(mean_l / 255.0)
    gamma = max(0.4, min(2.5, gamma))
    lut = np.array([((i / 255.0) ** gamma) * 255 for i in range(256)]).astype(np.uint8)
    return cv2.LUT(bal, lut)


def _percentile_from_hist(channel, lo_pct, hi_pct):
    hist = cv2.calcHist([channel], [0], None, [256], [0, 256]).ravel()
    cdf = np.cumsum(hist)
    total = cdf[-1]
    if total == 0:
        return 0, 255
    lo = int(np.searchsorted(cdf, total * lo_pct / 100.0))
    hi = int(np.searchsorted(cdf, total * hi_pct / 100.0))
    return lo, min(hi, 255)


def _build_stretch_lut(lo, hi):
    if hi <= lo:
        return np.arange(256, dtype=np.uint8)
    x = np.arange(256, dtype=np.float32)
    return np.clip((x - lo) * (255.0 / (hi - lo)), 0, 255).astype(np.uint8)


def _enhance_stretch(frame):
    s = _stretch_state
    s["frame_idx"] += 1
    if s["lut_b"] is None or s["frame_idx"] % 5 == 0:
        small = cv2.resize(frame, (0, 0), fx=0.5, fy=0.5, interpolation=cv2.INTER_AREA)
        b, g, r = cv2.split(small)
        s["lut_b"] = _build_stretch_lut(*_percentile_from_hist(b, 2, 98))
        s["lut_g"] = _build_stretch_lut(*_percentile_from_hist(g, 2, 98))
        s["lut_r"] = _build_stretch_lut(*_percentile_from_hist(r, 2, 98))
    b, g, r = cv2.split(frame)
    return cv2.merge((cv2.LUT(b, s["lut_b"]), cv2.LUT(g, s["lut_g"]), cv2.LUT(r, s["lut_r"])))


def apply_enhancement(frame, mode: str | None):
    if frame is None or mode in ("off", "", None):
        return frame
    try:
        if mode == "clahe":      return _enhance_clahe(frame)
        if mode == "auto_gamma": return _enhance_auto_gamma(frame)
        if mode == "stretch":    return _enhance_stretch(frame)
    except Exception as exc:
        log.warning("enhancement %s failed: %s", mode, exc)
    return frame


# ─────────────────────────────────────────────────────────────────────────
# Grip classification
# ─────────────────────────────────────────────────────────────────────────
class Grip(str, Enum):
    POWER = "power"
    HOOK = "hook"
    PINCH = "pinch"
    OPEN = "open"
    RELAXED = "relaxed"
    UNKNOWN = "unknown"


HOLDING_GRIPS = {Grip.POWER, Grip.HOOK, Grip.PINCH}


def classify_grip(landmarks_px: list[tuple[int, int]]) -> tuple[Grip, list[float]]:
    """Returns (Grip, [thumb,index,middle,ring,pinky] curl angles in deg)."""
    if not landmarks_px or len(landmarks_px) < 21:
        return Grip.UNKNOWN, []

    angles: dict[str, float] = {}
    states: dict[str, str] = {}
    for name, (mcp_i, pip_i, dip_i, _tip_i) in FINGERS.items():
        ang = angle_3pts_deg(landmarks_px[mcp_i], landmarks_px[pip_i], landmarks_px[dip_i])
        angles[name] = round(ang, 1)
        if ang < CURL_THRESHOLD_DEG:
            states[name] = "curled"
        elif ang < CURL_THRESHOLD_DEG * 2.2:
            states[name] = "semi"
        else:
            states[name] = "extended"

    non_thumb_curled = sum(1 for f in ("index", "middle", "ring", "pinky")
                           if states[f] in ("curled", "semi"))
    thumb_state = states["thumb"]
    index_state = states["index"]

    if non_thumb_curled >= 3 and thumb_state in ("curled", "semi"):
        grip = Grip.POWER
    elif non_thumb_curled >= 3:
        grip = Grip.HOOK
    elif index_state in ("curled", "semi") and thumb_state in ("curled", "semi") and non_thumb_curled <= 2:
        grip = Grip.PINCH
    elif non_thumb_curled == 0 and thumb_state == "extended":
        grip = Grip.OPEN
    else:
        grip = Grip.RELAXED

    curl_list = [angles[n] for n in ("thumb", "index", "middle", "ring", "pinky")]
    return grip, curl_list


# ─────────────────────────────────────────────────────────────────────────
# Hand observation + motion
# ─────────────────────────────────────────────────────────────────────────
@dataclass
class HandObs:
    handedness: str
    center: tuple[int, int]
    bbox: tuple[int, int, int, int]
    landmarks_px: list[tuple[int, int]]
    grip: Grip = Grip.UNKNOWN
    finger_curls: list[float] = field(default_factory=list)
    is_moving: bool = False
    score: float = 1.0


@dataclass
class HandMotionTracker:
    history_size: int = 10
    threshold_px: int = 8
    history: deque[tuple[int, int]] = field(default_factory=lambda: deque(maxlen=10))

    def __post_init__(self):
        self.history = deque(maxlen=self.history_size)

    def update(self, x: int, y: int):
        self.history.append((x, y))

    def is_moving(self) -> bool:
        if len(self.history) < 3:
            return False
        ox, oy = self.history[0]
        nx, ny = self.history[-1]
        return math.hypot(nx - ox, ny - oy) >= self.threshold_px


class StationMotion:
    def __init__(self):
        self.trackers: dict[str, HandMotionTracker] = {}

    def update(self, key: str, x: int, y: int) -> bool:
        t = self.trackers.get(key)
        if t is None:
            t = HandMotionTracker()
            self.trackers[key] = t
        t.update(x, y)
        return t.is_moving()

    def prune(self, keep: set[str]):
        for k in list(self.trackers):
            if k not in keep:
                del self.trackers[k]


# ─────────────────────────────────────────────────────────────────────────
# Activity classifier with 6-frame hysteresis
# ─────────────────────────────────────────────────────────────────────────
class State(str, Enum):
    ACTIVE = "active"
    IDLE = "idle"
    NO_WORKER = "no_worker"
    CAMERA_LOST = "camera_lost"


class ActivityClassifier:
    def __init__(self, smooth_frames: int = 6):
        self.smooth = max(1, smooth_frames)
        self._displayed = State.NO_WORKER
        self._raw = State.NO_WORKER
        self._streak = 0

    @property
    def displayed(self) -> State:
        return self._displayed

    def step(self, *, stream_alive: bool, hands_in_roi: int,
             any_holding_grip: bool, any_hand_moving: bool) -> State:
        if not stream_alive:
            self._raw = self._displayed = State.CAMERA_LOST
            self._streak = 0
            return self._displayed
        if hands_in_roi == 0:
            self._raw = self._displayed = State.NO_WORKER
            self._streak = 0
            return self._displayed

        is_active = any_holding_grip and any_hand_moving
        new_raw = State.ACTIVE if is_active else State.IDLE

        if new_raw == self._raw:
            self._streak += 1
        else:
            self._raw = new_raw
            self._streak = 1

        if self._streak >= self.smooth and self._raw != self._displayed:
            self._displayed = self._raw
        return self._displayed


# ─────────────────────────────────────────────────────────────────────────
# MJPEG stream reader (auto-discovery + reconnect)
# ─────────────────────────────────────────────────────────────────────────
class StreamReader:
    """Background MJPEG client. .latest() always returns the freshest frame."""

    def __init__(self, page_url: str, display_size: tuple[int, int] = (640, 360)):
        self.page_url = page_url
        self.display_size = display_size
        self._lock = threading.Lock()
        self._latest: np.ndarray | None = None
        self.alive = False
        self._stop = threading.Event()
        self._thread = threading.Thread(target=self._run, daemon=True, name=f"stream-{page_url}")

    def start(self):
        self._thread.start()

    def stop(self):
        self._stop.set()

    def latest(self) -> np.ndarray | None:
        with self._lock:
            return None if self._latest is None else self._latest.copy()

    def _discover(self) -> str:
        r = requests.get(self.page_url, timeout=(5, 10))
        r.raise_for_status()
        ct = r.headers.get("Content-Type", "")
        if any(x in ct for x in ("multipart", "mjpeg", "mjpg")):
            return self.page_url
        m = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', r.text, re.IGNORECASE)
        if not m:
            raise RuntimeError("No <img> tag — cannot discover stream URL")
        return urljoin(self.page_url, m.group(1))

    def _run(self):
        backoff = 1.0
        stream_url: str | None = None
        while not self._stop.is_set():
            try:
                if stream_url is None:
                    stream_url = self._discover()
                    log.info("[%s] stream discovered: %s", self.page_url, stream_url)
                self.alive = False
                resp = requests.get(stream_url, stream=True, timeout=(5, 30))
                resp.raise_for_status()
                self.alive = True
                backoff = 1.0
                buf = b""
                for chunk in resp.iter_content(chunk_size=8192):
                    if self._stop.is_set():
                        return
                    if not chunk:
                        continue
                    buf += chunk
                    a = buf.find(b"\xff\xd8")
                    e = buf.find(b"\xff\xd9")
                    if a != -1 and e > a:
                        jpg = buf[a:e + 2]
                        buf = buf[e + 2:]
                        img = cv2.imdecode(np.frombuffer(jpg, dtype=np.uint8), cv2.IMREAD_COLOR)
                        if img is not None:
                            img = cv2.resize(img, self.display_size)
                            with self._lock:
                                self._latest = img
            except Exception as exc:
                self.alive = False
                log.warning("[%s] stream error: %s — backoff %.1fs", self.page_url, exc, backoff)
                self._stop.wait(backoff)
                backoff = min(backoff * 2, 60.0)


# ─────────────────────────────────────────────────────────────────────────
# MediaPipe Tasks API wrapper
# ─────────────────────────────────────────────────────────────────────────
def _ensure_model(path: str = DEFAULT_MODEL_PATH, url: str = DEFAULT_MODEL_URL) -> str:
    p = Path(path)
    if p.exists() and p.stat().st_size > 0:
        return path
    p.parent.mkdir(parents=True, exist_ok=True)
    log.info("Downloading hand_landmarker.task → %s", path)
    with requests.get(url, stream=True, timeout=120) as r:
        r.raise_for_status()
        with open(p, "wb") as f:
            for chunk in r.iter_content(chunk_size=65536):
                if chunk:
                    f.write(chunk)
    log.info("Model saved (%d bytes)", p.stat().st_size)
    return path


class MediaPipeHands:
    """Tasks API wrapper. Single-threaded — one instance per StationWorker."""

    def __init__(self, model_path: str | None = None,
                 max_hands: int = 2,
                 detection_conf: float = 0.3,
                 presence_conf: float = 0.3,
                 tracking_conf: float = 0.3):
        import mediapipe as mp
        from mediapipe.tasks import python as mp_python
        from mediapipe.tasks.python import vision as mp_vision

        self._mp = mp
        path = _ensure_model(model_path or DEFAULT_MODEL_PATH)

        opts = mp_vision.HandLandmarkerOptions(
            base_options                  = mp_python.BaseOptions(model_asset_path=path),
            running_mode                  = mp_vision.RunningMode.VIDEO,
            num_hands                     = max_hands,
            min_hand_detection_confidence = detection_conf,
            min_hand_presence_confidence  = presence_conf,
            min_tracking_confidence       = tracking_conf,
        )
        self.detector = mp_vision.HandLandmarker.create_from_options(opts)
        self._t0_ns = time.monotonic_ns()
        self._last_ts_ms = -1

    def _next_ts(self) -> int:
        ts = (time.monotonic_ns() - self._t0_ns) // 1_000_000
        if ts <= self._last_ts_ms:
            ts = self._last_ts_ms + 1
        self._last_ts_ms = ts
        return ts

    def detect(self, frame_bgr) -> list[HandObs]:
        h, w = frame_bgr.shape[:2]
        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        mp_image = self._mp.Image(image_format=self._mp.ImageFormat.SRGB, data=rgb)
        result = self.detector.detect_for_video(mp_image, self._next_ts())

        out: list[HandObs] = []
        if not result.hand_landmarks:
            return out
        for lm_list, hd in zip(result.hand_landmarks, result.handedness):
            label = hd[0].category_name
            score = float(hd[0].score)
            xs = [int(lm.x * w) for lm in lm_list]
            ys = [int(lm.y * h) for lm in lm_list]
            pts = list(zip(xs, ys))
            cx, cy = int(sum(xs) / len(xs)), int(sum(ys) / len(ys))
            x1, y1, x2, y2 = min(xs), min(ys), max(xs), max(ys)
            grip, curls = classify_grip(pts)
            out.append(HandObs(
                handedness=label, center=(cx, cy), bbox=(x1, y1, x2, y2),
                landmarks_px=pts, grip=grip, finger_curls=curls, score=score,
            ))
        return out

    def close(self):
        try:
            self.detector.close()
        except Exception:
            pass


# ─────────────────────────────────────────────────────────────────────────
# YOLO glove + person detector (loaded only if models/hands.pt exists)
# ─────────────────────────────────────────────────────────────────────────
@dataclass
class GloveObs:
    cls_name: str                                    # 'glove' or 'person'
    bbox: tuple[int, int, int, int]                  # x1, y1, x2, y2
    center: tuple[int, int]
    score: float = 1.0
    is_moving: bool = False


class GloveDetector:
    """Wraps a Phase-2 trained YOLOv8 (glove + person)."""

    def __init__(self, model_path: str = "models/hands.pt", conf: float = 0.25):
        from ultralytics import YOLO
        self.model = YOLO(model_path)
        self.class_names = list(self.model.names.values())   # e.g. ['glove', 'person']
        self.conf = conf

    def detect(self, frame_bgr) -> list[GloveObs]:
        result = self.model.predict(frame_bgr, conf=self.conf, verbose=False)[0]
        out: list[GloveObs] = []
        if result.boxes is None:
            return out
        for b in result.boxes:
            cls_id = int(b.cls.item())
            x1, y1, x2, y2 = [int(v) for v in b.xyxy[0].tolist()]
            cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
            out.append(GloveObs(
                cls_name=self.class_names[cls_id],
                bbox=(x1, y1, x2, y2),
                center=(cx, cy),
                score=float(b.conf.item()),
            ))
        return out


# ─────────────────────────────────────────────────────────────────────────
# Per-station worker
# ─────────────────────────────────────────────────────────────────────────
@dataclass
class StationCfg:
    id: str
    name: str
    page_url: str
    enhancement: str = "off"   # off / clahe / auto_gamma / stretch — raw is best for YOLO
    roi: tuple[float, float, float, float] = (0.0, 0.0, 1.0, 1.0)


class StationWorker:
    """One thread per station: read frames → enhance → detect → classify → publish."""

    def __init__(self, cfg: StationCfg, on_event: Callable[[dict], None],
                 on_preview: Callable[[str, bytes], None]):
        self.cfg = cfg
        self.on_event = on_event
        self.on_preview = on_preview

        self.classifier = ActivityClassifier(smooth_frames=6)
        self.motion = StationMotion()
        self.reader = StreamReader(cfg.page_url)
        self.detector: MediaPipeHands | None = None  # lazy — only when first frame arrives

        # Optional YOLO glove + person detector. Loaded eagerly if models/hands.pt exists.
        # When loaded, replaces MediaPipe entirely (faster + works on gloved hands).
        self.glove_detector: GloveDetector | None = None
        yolo_path = Path("models/hands.pt")
        if yolo_path.exists() and yolo_path.stat().st_size > 0:
            try:
                self.glove_detector = GloveDetector(str(yolo_path))
                log.info("YOLO glove detector loaded: classes=%s",
                         self.glove_detector.class_names)
            except Exception as exc:
                log.error("Failed to load YOLO glove model: %s — falling back to MediaPipe", exc)
                self.glove_detector = None

        self._stop = threading.Event()
        self._thread = threading.Thread(target=self._run, daemon=True, name=f"worker-{cfg.name}")
        self._last_publish = 0.0
        self._frames_since_publish = 0   # counted in main loop, drained by _compute_fps
        self.last_state = State.NO_WORKER

    def start(self):
        self.reader.start()
        self._thread.start()

    def stop(self):
        self._stop.set()
        self.reader.stop()

    def update_cfg(self, cfg: StationCfg):
        self.cfg = cfg

    def _run(self):
        log.info("worker started: %s (%s)", self.cfg.name, self.cfg.id)
        while not self._stop.is_set():
            frame = self.reader.latest()
            if frame is None:
                self._maybe_emit_camera_lost()
                time.sleep(0.05)
                continue

            try:
                enhanced = apply_enhancement(frame, self.cfg.enhancement)
                h, w = frame.shape[:2]

                if self.glove_detector is not None:
                    detections = self.glove_detector.detect(enhanced)
                    hands_in_roi, moving, any_holding = self._yolo_activity_inputs(
                        detections, w, h
                    )
                else:
                    if self.detector is None:
                        self.detector = MediaPipeHands()
                    detections = self.detector.detect(enhanced)
                    hands_in_roi, moving, any_holding = self._activity_inputs(
                        detections, w, h
                    )

                state = self.classifier.step(
                    stream_alive=self.reader.alive,
                    hands_in_roi=hands_in_roi,
                    any_holding_grip=any_holding,
                    any_hand_moving=moving > 0,
                )
                self.last_state = state

                if self.glove_detector is not None:
                    annotated = self._annotate_yolo(frame, detections, state)
                else:
                    annotated = self._annotate(frame, detections, state)
                ok, jpg = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 70])
                if ok:
                    self.on_preview(self.cfg.id, jpg.tobytes())

                self._frames_since_publish += 1   # for real-FPS measurement

                now = time.time()
                if now - self._last_publish >= 1.0:
                    self._last_publish = now
                    real_fps = self._compute_fps()
                    log.info("[%s] real_fps=%.2f  state=%s  detections=%d",
                             self.cfg.name, real_fps, state.value, len(detections))
                    self._emit(state, detections, fps=real_fps)
            except Exception as exc:
                log.exception("worker %s frame error: %s", self.cfg.name, exc)
                time.sleep(0.05)

        log.info("worker stopped: %s", self.cfg.name)

    def _activity_inputs(self, hands, w, h) -> tuple[int, int, bool]:
        rx1 = int(self.cfg.roi[0] * w); ry1 = int(self.cfg.roi[1] * h)
        rx2 = int((self.cfg.roi[0] + self.cfg.roi[2]) * w)
        ry2 = int((self.cfg.roi[1] + self.cfg.roi[3]) * h)

        in_roi = 0
        moving = 0
        any_holding = False
        keep: set[str] = set()
        for i, hand in enumerate(hands):
            cx, cy = hand.center
            inside = rx1 <= cx <= rx2 and ry1 <= cy <= ry2
            key = f"{hand.handedness}-{i}"
            keep.add(key)
            is_mov = self.motion.update(key, cx, cy)
            hand.is_moving = is_mov
            if inside:
                in_roi += 1
                if is_mov:
                    moving += 1
                if hand.grip in HOLDING_GRIPS:
                    any_holding = True
        self.motion.prune(keep)
        return in_roi, moving, any_holding

    def _yolo_activity_inputs(self, detections, w, h) -> tuple[int, int, bool]:
        """Map YOLO glove+person detections into the same shape as _activity_inputs.

        - hands_in_roi   = number of glove detections whose center is inside ROI
        - moving         = 1 if the centroid of all in-ROI gloves moved > threshold else 0
        - any_holding    = True if at least one glove in ROI (gloves = always holding)
        """
        rx1 = int(self.cfg.roi[0] * w); ry1 = int(self.cfg.roi[1] * h)
        rx2 = int((self.cfg.roi[0] + self.cfg.roi[2]) * w)
        ry2 = int((self.cfg.roi[1] + self.cfg.roi[3]) * h)

        glove_centers: list[tuple[int, int]] = []
        for d in detections:
            if d.cls_name != 'glove':
                continue
            cx, cy = d.center
            if rx1 <= cx <= rx2 and ry1 <= cy <= ry2:
                glove_centers.append((cx, cy))

        gloves_in_roi = len(glove_centers)
        if gloves_in_roi == 0:
            self.motion.prune(set())   # drop any stale "centroid" track
            return 0, 0, False

        cx_avg = sum(c[0] for c in glove_centers) // gloves_in_roi
        cy_avg = sum(c[1] for c in glove_centers) // gloves_in_roi
        is_moving = self.motion.update("centroid", cx_avg, cy_avg)
        self.motion.prune({"centroid"})

        # Annotate detections with motion state (used by _annotate_yolo for color)
        for d in detections:
            d.is_moving = is_moving and d.cls_name == 'glove'

        return gloves_in_roi, (1 if is_moving else 0), True

    def _annotate_yolo(self, frame, detections, state):
        out = frame.copy()
        h, w = out.shape[:2]
        rx1 = int(self.cfg.roi[0] * w); ry1 = int(self.cfg.roi[1] * h)
        rx2 = int((self.cfg.roi[0] + self.cfg.roi[2]) * w)
        ry2 = int((self.cfg.roi[1] + self.cfg.roi[3]) * h)
        cv2.rectangle(out, (rx1, ry1), (rx2, ry2), (0, 200, 255), 2)

        for d in detections:
            x1, y1, x2, y2 = d.bbox
            if d.cls_name == 'glove':
                col = (0, 220, 0) if d.is_moving else (0, 165, 255)   # green moving / amber still
            else:  # person
                col = (255, 100, 255)                                 # magenta
            cv2.rectangle(out, (x1, y1), (x2, y2), col, 2)
            label = f"{d.cls_name} {d.score:.2f}"
            cv2.putText(out, label, (x1, max(15, y1 - 5)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, col, 2)

        state_col = {State.ACTIVE: (0, 220, 0), State.IDLE: (0, 165, 255),
                     State.NO_WORKER: (180, 180, 180), State.CAMERA_LOST: (0, 0, 220)}[state]
        cv2.rectangle(out, (10, 10), (220, 50), (0, 0, 0), -1)
        cv2.putText(out, state.value.upper(), (20, 38),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.85, state_col, 2)
        return out

    def _annotate(self, frame, hands, state):
        out = frame.copy()
        h, w = out.shape[:2]
        rx1 = int(self.cfg.roi[0] * w); ry1 = int(self.cfg.roi[1] * h)
        rx2 = int((self.cfg.roi[0] + self.cfg.roi[2]) * w)
        ry2 = int((self.cfg.roi[1] + self.cfg.roi[3]) * h)
        cv2.rectangle(out, (rx1, ry1), (rx2, ry2), (0, 200, 255), 2)

        for hand in hands:
            inside = rx1 <= hand.center[0] <= rx2 and ry1 <= hand.center[1] <= ry2
            col = (0, 255, 0) if inside else (0, 60, 255)
            for a, b in HAND_CONNECTIONS:
                cv2.line(out, hand.landmarks_px[a], hand.landmarks_px[b], col, 2)
            for px in hand.landmarks_px:
                cv2.circle(out, px, 3, col, -1)
            cv2.putText(out, f"{hand.handedness} {hand.grip.value.upper()}",
                        (hand.bbox[0], max(20, hand.bbox[1] - 6)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, col, 2)

        col = {State.ACTIVE: (0, 220, 0), State.IDLE: (0, 165, 255),
               State.NO_WORKER: (180, 180, 180), State.CAMERA_LOST: (0, 0, 220)}[state]
        cv2.rectangle(out, (10, 10), (220, 50), (0, 0, 0), -1)
        cv2.putText(out, state.value.upper(), (20, 38),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.85, col, 2)
        return out

    _last_tick = 0.0

    def _compute_fps(self) -> float:
        """Real fps = frames-processed-since-last-publish / elapsed-time."""
        now = time.perf_counter()
        n = self._frames_since_publish
        self._frames_since_publish = 0
        if self._last_tick == 0.0:
            self._last_tick = now
            return 0.0
        dt = now - self._last_tick
        self._last_tick = now
        return round(min(60.0, n / max(dt, 1e-6)), 2)

    def _emit(self, state: State, detections: list, fps: float):
        avg_conf = sum(d.score for d in detections) / len(detections) if detections else 0.0
        # MediaPipe detections have .handedness and .grip; YOLO detections do not.
        left  = next((d for d in detections if getattr(d, "handedness", None) == "Left"),  None)
        right = next((d for d in detections if getattr(d, "handedness", None) == "Right"), None)
        self.on_event({
            "ts": datetime.now(tz=timezone.utc).isoformat(),
            "station_id": self.cfg.id,
            "station_name": self.cfg.name,
            "state": state.value,
            "fps": fps,
            "conf": round(avg_conf, 3),
            "grip_l": left.grip.value if left else None,
            "grip_r": right.grip.value if right else None,
            "n_hands": len(detections),
        })

    def _maybe_emit_camera_lost(self):
        now = time.time()
        if now - self._last_publish < 2.0:
            return
        self._last_publish = now
        state = self.classifier.step(
            stream_alive=self.reader.alive,
            hands_in_roi=0, any_holding_grip=False, any_hand_moving=False,
        )
        self.last_state = state
        self.on_event({
            "ts": datetime.now(tz=timezone.utc).isoformat(),
            "station_id": self.cfg.id,
            "station_name": self.cfg.name,
            "state": state.value,
            "fps": 0.0, "conf": 0.0, "grip_l": None, "grip_r": None, "n_hands": 0,
        })


# ─────────────────────────────────────────────────────────────────────────
# Orchestrator
# ─────────────────────────────────────────────────────────────────────────
class Orchestrator:
    """Manages a pool of StationWorkers."""

    def __init__(self, on_event, on_preview):
        self.on_event = on_event
        self.on_preview = on_preview
        self.workers: dict[str, StationWorker] = {}
        self._lock = threading.Lock()

    def reconcile(self, desired: list[StationCfg]):
        with self._lock:
            desired_ids = {c.id for c in desired}
            for sid in list(self.workers):
                if sid not in desired_ids:
                    log.info("removing worker for %s", sid)
                    self.workers[sid].stop()
                    del self.workers[sid]
            for cfg in desired:
                if cfg.id in self.workers:
                    self.workers[cfg.id].update_cfg(cfg)
                    continue
                if not cfg.page_url:
                    continue
                w = StationWorker(cfg, self.on_event, self.on_preview)
                w.start()
                self.workers[cfg.id] = w

    def shutdown(self):
        with self._lock:
            for w in self.workers.values():
                w.stop()
            self.workers.clear()
