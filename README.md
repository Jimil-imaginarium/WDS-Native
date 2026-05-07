# WDS Vision — Native Windows build

Single-process, no Docker, no Postgres, no Redis, no WSL.

## Stack

- **Python 3.10+** (FastAPI + SQLAlchemy + SQLite + MediaPipe Tasks API)
- **Node 20+** (Vite + React + Tailwind + shadcn-style UI)
- **SQLite** for storage (a single file, `wds.db`, auto-created)
- **In-process threads** for per-station inference

## One-click launch

Double-click `start.bat`. The first run will:

1. Create `venv\` and install Python deps from `requirements.txt`
2. Run `npm install` inside `web\`
3. Open two terminal windows: the FastAPI server and the Vite dev server

Once they're up, open <http://127.0.0.1:5173> and log in. The admin password is printed once in the **"WDS Server"** window — copy it before closing.

## Manual launch (two terminals)

**Terminal 1:**
```cmd
cd C:\Users\marvelele\Desktop\wds-native
venv\Scripts\activate
python server.py
```

**Terminal 2:**
```cmd
cd C:\Users\marvelele\Desktop\wds-native\web
npm run dev
```

## Architecture

```
┌────────────┐   /api/* via Vite proxy   ┌──────────────────────────────┐
│  React     │ ─────────────────────────▶│   FastAPI (server.py)        │
│  :5173     │                            │   ├─ Auth (JWT)              │
│            │ ◀─── WebSocket ────────────│   ├─ Stations CRUD           │
└────────────┘                            │   ├─ WebSocket /api/ws/live  │
                                          │   ├─ Preview /api/.../preview│
                                          │   └─ Orchestrator            │
                                          │       ├─ StationWorker (×N)  │
                                          │       │   ├─ StreamReader    │
                                          │       │   ├─ MediaPipe Tasks │
                                          │       │   ├─ Grip + motion   │
                                          │       │   └─ ActivityClass.  │
                                          │       └─ on_event()──┐       │
                                          └──────────────────────┼───────┘
                                                                 │
                                       ┌─────────────────────────┴─────┐
                                       ▼                               ▼
                                 ┌────────────┐                 ┌──────────────┐
                                 │  wds.db    │                 │  Broadcast   │
                                 │  (SQLite)  │                 │  to all WS   │
                                 └────────────┘                 │  clients     │
                                                                └──────────────┘
```

## Files

```
wds-native/
├── server.py              # FastAPI + SQLite + auth + WS + orchestrator
├── vision.py              # MediaPipe + grip + motion + activity classifier
├── requirements.txt
├── start.bat              # one-click launcher
├── README.md              # this file
├── models/                # auto-downloaded hand_landmarker.task lives here
├── snapshots/             # idle-anomaly captures
├── wds.db                 # SQLite (auto-created)
└── web/                   # React frontend (copied from wds-vision)
```

## How a station goes from "added" to "live"

1. You POST to `/api/stations` (via the Admin UI) with a `page_url`
2. Within 5 seconds, the **reconcile loop** in `server.py` notices the new station and asks the orchestrator to spawn a `StationWorker`
3. The worker:
   - Spins up a `StreamReader` thread that pulls MJPEG from `page_url`
   - Lazily loads MediaPipe (downloads `hand_landmarker.task` once on first use)
   - For every frame: enhance → detect hands → classify grip → check motion → 6-frame hysteresis → publish event
4. Each event is written to `wds.db` and broadcast over WebSocket
5. The dashboard tile flips ACTIVE / IDLE in real time

## Troubleshooting

- **"WDS Server" window closes immediately** — check the console for traceback. Most likely: missing `mediapipe` dep (re-run `pip install -r requirements.txt`).
- **Login says "Invalid credentials"** — wrong password. Delete `wds.db` to re-seed (you'll get a new password printed).
- **Stations stay OFFLINE** — make sure the camera URL is reachable from Windows (`curl http://...`). The native server hits the camera directly (no Docker network in the way).
- **MediaPipe model download fails** — check internet. The file is ~7.5 MB. After successful download it's cached in `models/`.

## Differences from the Docker `wds-vision` build

What we removed for simplicity:
- Postgres + TimescaleDB → SQLite
- Redis Streams → in-process function calls
- Celery workers → threads
- MinIO → local `snapshots/` folder
- Prometheus / Grafana / Loki → not required for the demo
- The Phase D 25-station load test gate (single-process scales to ~10 cameras on a typical PC; beyond that you want the Docker build with GPU)

What we kept:
- Auth (JWT), Stations CRUD, Live Dashboard, Station Detail, live MJPEG preview
- The exact MediaPipe Tasks API + grip + motion logic from `handPoseDetection.py`
