# WDS Native — Session Handoff

Paste this whole file at the start of a new Claude session (launched from `C:\Users\marvelele\Desktop\wds-native\`).

---

## TL;DR — current state

Windows-native, single-process factory hand-tracking system. Detects ACTIVE / IDLE / NO_WORKER / CAMERA_LOST per workstation via a hybrid pipeline:

- **YOLOv8n** custom-trained on 3 classes (`hand`, `glove`, `person`) drives the ACTIVE / IDLE state machine
- **MediaPipe HandLandmarker** runs in parallel and overlays 21-keypoint skeleton on bare hands (visualization only — does NOT influence state)
- Hand + glove detections that overlap (IOU > 0.5) are deduplicated into a single entity, so each physical hand counts once

Live system verified end-to-end: state correctly flips ACTIVE / IDLE on a real Pi camera feed.

---

## Memory files (auto-loaded by future sessions)

Located at `~/.claude/projects/C--Users-marvelele-Desktop-wds-native/memory/`:

- `user_profile.md` — Windows-native, non-developer, Jimil-imaginarium on GitHub
- `feedback_no_external_services.md` — hard-no list (Docker, Postgres, Redis, Celery, MinIO, Prometheus, Grafana, Loki — all tried + rejected)
- `feedback_working_agreements.md` — phase gating, no silent fallbacks, one concern per change, MediaPipe Tasks API only
- `project_roadmap.md` — 5-phase plan
- `reference_existing_builds.md` — pointers to handPoseDetection.py + wds-native

Don't re-litigate the hard-no list or working agreements.

---

## Project layout

Single root: **`C:\Users\marvelele\Desktop\wds-native\`**

```
wds-native/
├── server.py                  ← FastAPI + SQLite + WebSocket + worker orchestrator
├── vision.py                  ← MediaPipe + YOLO + activity classifier (heavily modified)
├── start.bat                  ← spawns Server + Web cmd windows
├── requirements.txt           ← incl. ultralytics, pytest
├── README.md
├── OPERATOR_RUNBOOK.md        ← one-page operator manual (Phase 5)
├── SESSION_CONTEXT.md         ← this file
├── wds.db                     ← SQLite (gitignored, untracked)
├── .gitignore
│
├── models/
│   ├── hands.pt                       ← YOLOv8n 3-class (hand + glove + person), 6.2 MB
│   ├── hand_landmarker.task           ← MediaPipe weights (gitignored, auto-downloaded)
│   └── gesture_recognizer.task        ← MediaPipe weights (gitignored, auto-downloaded)
│
├── web/                       ← React/Vite dashboard
│   └── src/pages/StationDetailPage.tsx   ← preview URL has ?token=, 100ms poll
│
├── notebooks/
│   ├── auto_label_dataset.ipynb       ← Phase 1: YOLO-World auto-labeling
│   └── train_glove_yolo.ipynb         ← Phase 2: 3-class YOLOv8n training
│
├── tests/                     ← 37 pytest tests, all passing
│   ├── conftest.py, test_grip.py, test_motion.py, test_activity.py, test_enhancement.py
│
├── diagnose_stream.py         ← debug: Pi MJPEG byte parser
├── diagnose_pipeline.py       ← debug: full pipeline dry-run
├── test_glove_model.py        ← verify models/hands.pt
├── export_events.py           ← Phase 4b helper: export events table to CSV
└── venv/                      ← (gitignored)
```

GitHub: **https://github.com/Jimil-imaginarium/WDS-Native**

---

## Detection logic (current)

### Pipeline per frame (when `models/hands.pt` is present)

```
StreamReader → frame (640x360 BGR)
     ↓
apply_enhancement(frame, mode)        ← user config, default "off"
     ↓
yolo_dets   = GloveDetector.detect(enhanced)        # hand/glove/person bboxes
mp_hands    = MediaPipeHands.detect(enhanced)       # 21-kp skeleton (max 4 hands)
     ↓
_yolo_activity_inputs(yolo_dets, w, h):
    1. Filter to ROI
    2. Dedup hand+glove pairs via IOU > 0.5 → "entities"
    3. n_in_roi = entities ?: persons
    4. any_holding = bool(entities)
    5. motion = centroid of entities (or persons) moves > 8 px
     ↓
ActivityClassifier.step(...) + 6-frame hysteresis
     ↓
state ∈ {ACTIVE, IDLE, NO_WORKER, CAMERA_LOST}
     ↓
_annotate_yolo(frame, yolo_dets, mp_hands, state):
    - Draw deduped hand/glove → one box per entity, labeled "hand" (green/amber)
    - Draw person → green/magenta
    - Draw 21-pt skeleton over mp_hands (cyan)
    - Draw state badge top-left
     ↓
JPEG encode → preview_store → frontend
```

### Activity rule

```
NO_WORKER       ⇔  nothing in ROI
ACTIVE          ⇔  hand or glove entity in ROI AND centroid moving > 8 px
IDLE            ⇔  hand/glove or person visible but not satisfying ACTIVE
CAMERA_LOST     ⇔  stream not alive
```

Plus 6-frame hysteresis on ACTIVE↔IDLE transitions.

---

## Phase status

| Phase | Status | Result |
|---|---|---|
| 1 — Auto-label dataset | ✅ done (twice; latest run produced 3-class labels) | wds_dataset on Drive |
| 2 — Train YOLOv8n | ✅ done (latest 3-class) | mAP@0.5: hand 0.645, glove 0.789, person 0.973, overall 0.802 |
| 3 — Wire into wds-native | ✅ done + live-verified | YOLO + MediaPipe skeleton hybrid path; dedup; FPS ~11–12 |
| 4a — Unit tests | ✅ done | 37/37 passing, found and fixed 2 latent bugs (thumb tuple, auto_gamma) |
| 4b — Recorded validation | ❌ deferred | Helper script `export_events.py` written, but 30-min recording + hand-labeling still needed |
| 5 — Operator runbook | ✅ done | `OPERATOR_RUNBOOK.md` written |
| 5 — v1.0.0 release tag | ⚠️ in progress | After this session's commit |

---

## Bugs fixed across the project

1. Preview always black — `<img>` couldn't send Bearer header; fixed via `?token=` query param
2. JWT_SECRET regenerates on restart — known, must re-login after each `python server.py`
3. FPS stuck at 1.0 — calculation now counts real frames
4. Hand thumb tuple bug — `pip_i == dip_i` made thumb always-curled; fixed
5. auto_gamma inverted — was darkening dark frames; fixed
6. MediaPipe blind to gloved hands — solved by training YOLO with `hand` + `glove` classes
7. autodistill build failure on Colab Python 3.12 — pivoted to ultralytics-direct YOLO-World

---

## Hardware

- Windows 11, Python 3.12, Node 24, no GPU
- Pi camera at `http://192.168.4.136:8091/` (HTML wrapper, MJPEG at `/stream`)
- Both on `192.168.4.0/24` LAN

---

## Credentials

- Admin email: **`admin@wds.local`**
- Admin password: **`lUpHvXYXTOI-FJKcczfTt8yt`** (original; persists in `wds.db`)
- Recovery: `del wds.db` → restart → new password in server window (wipes all events + stations)

---

## How to launch

```cmd
cd "C:\Users\marvelele\Desktop\wds-native"
start.bat
```

Look in WDS Server window for:
```
[INFO ] vision: YOLO detector loaded: classes=['hand', 'glove', 'person']
```

Browser → http://localhost:5173 → sign in.

Per-second log line:
```
real_fps=N.NN state=active hand_entities=N person=N skeleton=N
```

- `hand_entities` = unique hand entities after IOU dedup
- `person` = person bboxes
- `skeleton` = bare-hand skeletons MediaPipe found (often 0 in this factory because workers wear gloves — by design)

---

## What's still open

- **Phase 4b** — record 30 min of factory video with the live system, hand-label ACTIVE/IDLE every 10 s, run `export_events.py` for the system's reading, compare for ≥ 92% accuracy. The helper script is ready; only the recording session is missing.
- **v1.0.0 GitHub release tag** — created after the final commit lands

---

## Hard rules (don't re-litigate)

- No Docker, Postgres, Redis, Celery, MinIO, Prometheus, Grafana, Loki, K8s, gRPC. All tried + rejected.
- Single-process Python + SQLite + React + threads-per-station.
- MediaPipe Tasks API only (legacy `mp.solutions.hands` is broken).
- Phase gating: don't pre-build later phases.
- No silent fallbacks: if YOLO model fails to load, log loudly.
- One concern per change.
- `start.bat` IS the deployment.
- The factory is **job-shop** — workpieces change every day. Don't try to detect specific workpieces.

---

## First action in the new session

1. Read this file (you just did)
2. Tell the user: "Got the context. Last open step is the 30-min Phase 4b recorded validation. Want me to walk you through that, or pick a different task?"
