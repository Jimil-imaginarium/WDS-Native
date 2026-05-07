"""WDS Vision — Windows-native single-process server.

Runs FastAPI + SQLite + WebSocket + per-station MediaPipe inference workers
all in one Python process. No Docker, no Postgres, no Redis.

Usage:
    venv\\Scripts\\activate
    python server.py
"""
from __future__ import annotations

import asyncio
import json
import logging
import secrets
import sys
import threading
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Annotated, AsyncIterator

from fastapi import (
    Depends, FastAPI, HTTPException, Query, Response, WebSocket,
    WebSocketDisconnect, status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import (
    Boolean, Column, DateTime, Enum as SAEnum, Float, Integer, String, Text,
    create_engine, desc, func, select,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

from vision import Orchestrator, StationCfg

# ─── Force UTF-8 stdout (Windows cmd is cp1252) ─────────────────────────
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)-5s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)
log = logging.getLogger("server")

# ─────────────────────────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────────────────────────
DB_FILE = Path("wds.db")
DATABASE_URL = f"sqlite:///{DB_FILE.absolute().as_posix()}"
JWT_SECRET = "dev_secret_change_me_in_prod_" + secrets.token_hex(8)
JWT_ALGO = "HS256"
ACCESS_TTL = timedelta(hours=8)        # generous in dev — single user
CORS_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]
SNAPSHOT_DIR = Path("snapshots")
SNAPSHOT_DIR.mkdir(exist_ok=True)

# ─────────────────────────────────────────────────────────────────────────
# Database (SQLite)
# ─────────────────────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id:       Mapped[str]  = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email:    Mapped[str]  = mapped_column(String(254), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    hashed_password: Mapped[str] = mapped_column(String(128))
    role:     Mapped[str]  = mapped_column(String(32), default="admin")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.current_timestamp())


class Station(Base):
    __tablename__ = "stations"
    id:       Mapped[str]  = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name:     Mapped[str]  = mapped_column(String(120), unique=True, index=True)
    location: Mapped[str | None] = mapped_column(String(120), nullable=True)
    page_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    enhancement_mode: Mapped[str] = mapped_column(String(32), default="off")
    roi_x: Mapped[float] = mapped_column(Float, default=0.0)
    roi_y: Mapped[float] = mapped_column(Float, default=0.0)
    roi_w: Mapped[float] = mapped_column(Float, default=1.0)
    roi_h: Mapped[float] = mapped_column(Float, default=1.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.current_timestamp())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.current_timestamp(),
                                                  onupdate=func.current_timestamp())


class Event(Base):
    __tablename__ = "events"
    id:        Mapped[int]    = mapped_column(Integer, primary_key=True, autoincrement=True)
    ts:        Mapped[datetime] = mapped_column(DateTime, index=True)
    station_id: Mapped[str]  = mapped_column(String(36), index=True)
    state:     Mapped[str]   = mapped_column(String(32))
    grip_l:    Mapped[str | None] = mapped_column(String(32), nullable=True)
    grip_r:    Mapped[str | None] = mapped_column(String(32), nullable=True)
    fps:       Mapped[float | None] = mapped_column(Float, nullable=True)
    conf:      Mapped[float | None] = mapped_column(Float, nullable=True)


engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─────────────────────────────────────────────────────────────────────────
# Auth helpers
# ─────────────────────────────────────────────────────────────────────────
_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
_oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def hash_password(p: str) -> str:
    return _pwd.hash(p)


def verify_password(p: str, h: str) -> bool:
    return _pwd.verify(p, h)


def create_token(user_id: str, role: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + ACCESS_TTL).timestamp()),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def get_current_user(
    token: Annotated[str | None, Depends(_oauth2)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        claims = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except JWTError as exc:
        raise HTTPException(401, "Invalid or expired token") from exc
    user = db.get(User, claims.get("sub"))
    if not user or not user.is_active:
        raise HTTPException(401, "User not found or disabled")
    return user


# ─────────────────────────────────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────────────────────────────────
class LoginIn(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=128)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool


class StationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    location: str | None = None
    page_url: str | None = None
    enhancement_mode: str = "off"


class StationUpdate(BaseModel):
    name: str | None = None
    location: str | None = None
    page_url: str | None = None
    enhancement_mode: str | None = None
    is_active: bool | None = None


class StationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    location: str | None
    page_url: str | None
    enhancement_mode: str
    is_active: bool


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    ts: datetime
    station_id: str
    state: str
    grip_l: str | None
    grip_r: str | None
    fps: float | None
    conf: float | None


# ─────────────────────────────────────────────────────────────────────────
# WebSocket connection manager
# ─────────────────────────────────────────────────────────────────────────
class WSManager:
    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()
        self._loop: asyncio.AbstractEventLoop | None = None

    def attach_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    async def connect(self, ws: WebSocket) -> None:
        self._connections.add(ws)

    async def disconnect(self, ws: WebSocket) -> None:
        self._connections.discard(ws)

    async def broadcast(self, payload: dict) -> None:
        stale: list[WebSocket] = []
        for ws in list(self._connections):
            try:
                await ws.send_json(payload)
            except Exception:
                stale.append(ws)
        for ws in stale:
            self._connections.discard(ws)

    def schedule_broadcast(self, payload: dict) -> None:
        """Thread-safe — called from worker threads."""
        if self._loop is None:
            return
        asyncio.run_coroutine_threadsafe(self.broadcast(payload), self._loop)


ws_manager = WSManager()

# Per-station latest annotated JPEG (in-memory; written by workers, read by HTTP)
preview_store: dict[str, bytes] = {}
preview_lock = threading.Lock()


def on_event(event: dict) -> None:
    """Called from each StationWorker thread — persist + broadcast."""
    # Persist (best effort — never block the worker)
    try:
        with SessionLocal() as db:
            db.add(Event(
                ts=datetime.fromisoformat(event["ts"].replace("Z", "+00:00")),
                station_id=event["station_id"],
                state=event["state"],
                grip_l=event.get("grip_l"),
                grip_r=event.get("grip_r"),
                fps=event.get("fps"),
                conf=event.get("conf"),
            ))
            db.commit()
    except Exception as exc:
        log.warning("event persist failed: %s", exc)
    # Broadcast to dashboard
    ws_manager.schedule_broadcast({
        "type": "event",
        "station_id": event["station_id"],
        "station_name": event.get("station_name"),
        "state": event["state"],
        "ts": event["ts"],
        "fps": event.get("fps"),
        "conf": event.get("conf"),
        "grip_l": event.get("grip_l"),
        "grip_r": event.get("grip_r"),
    })


def on_preview(station_id: str, jpg_bytes: bytes) -> None:
    """Called from each worker — stash latest JPEG."""
    with preview_lock:
        preview_store[station_id] = jpg_bytes


# ─────────────────────────────────────────────────────────────────────────
# Orchestrator + reconcile loop
# ─────────────────────────────────────────────────────────────────────────
orchestrator = Orchestrator(on_event=on_event, on_preview=on_preview)


def reconcile_loop(stop_evt: threading.Event) -> None:
    """Polls SQLite every 5 s, syncs the worker pool to the DB."""
    while not stop_evt.is_set():
        try:
            with SessionLocal() as db:
                stations = db.scalars(select(Station).where(Station.is_active.is_(True))).all()
            cfgs = [
                StationCfg(
                    id=s.id, name=s.name,
                    page_url=s.page_url or "",
                    enhancement=s.enhancement_mode or "off",
                    roi=(s.roi_x, s.roi_y, s.roi_w, s.roi_h),
                )
                for s in stations
            ]
            orchestrator.reconcile(cfgs)
        except Exception as exc:
            log.warning("reconcile failed: %s", exc)
        stop_evt.wait(5.0)


# ─────────────────────────────────────────────────────────────────────────
# Lifespan: bootstrap DB, seed admin, start reconcile thread
# ─────────────────────────────────────────────────────────────────────────
def seed_admin_if_missing(db: Session) -> None:
    if db.scalar(select(User).where(User.email == "admin@wds.local")):
        return
    pw = secrets.token_urlsafe(18)
    user = User(
        email="admin@wds.local",
        full_name="System Administrator",
        hashed_password=hash_password(pw),
        role="admin",
    )
    db.add(user)
    db.commit()
    banner = (
        "\n"
        "╔══════════════════════════════════════════════════════════════════╗\n"
        "║                  ADMIN ACCOUNT CREATED                           ║\n"
        "╠══════════════════════════════════════════════════════════════════╣\n"
        f"║  Email   : admin@wds.local                                       ║\n"
        f"║  Password: {pw:<54}║\n"
        "║                                                                  ║\n"
        "║  ⚠  Save this password — it will not be shown again.            ║\n"
        "╚══════════════════════════════════════════════════════════════════╝\n"
    )
    print(banner)


_stop_reconcile = threading.Event()
_reconcile_thread: threading.Thread | None = None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed_admin_if_missing(db)

    ws_manager.attach_loop(asyncio.get_running_loop())

    global _reconcile_thread
    _reconcile_thread = threading.Thread(target=reconcile_loop, args=(_stop_reconcile,),
                                         daemon=True, name="reconcile")
    _reconcile_thread.start()
    log.info("WDS native server up — http://127.0.0.1:8000")
    yield

    log.info("shutting down…")
    _stop_reconcile.set()
    orchestrator.shutdown()
    log.info("goodbye")


# ─────────────────────────────────────────────────────────────────────────
# FastAPI app + routes
# ─────────────────────────────────────────────────────────────────────────
app = FastAPI(title="WDS Vision (native)", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS, allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)


# ── Health ───────────────────────────────────────────────────────────────
@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


# ── Auth ─────────────────────────────────────────────────────────────────
@app.post("/api/auth/login", response_model=TokenOut)
def login(payload: LoginIn, db: Annotated[Session, Depends(get_db)]) -> TokenOut:
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(401, "Invalid credentials")
    if not user.is_active:
        raise HTTPException(403, "Account disabled")
    return TokenOut(access_token=create_token(user.id, user.role))


@app.get("/api/auth/me", response_model=UserOut)
def me(user: Annotated[User, Depends(get_current_user)]) -> User:
    return user


# ── Stations CRUD ────────────────────────────────────────────────────────
@app.get("/api/stations", response_model=list[StationOut])
def list_stations(
    _: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[Station]:
    return list(db.scalars(select(Station).order_by(Station.name)))


@app.post("/api/stations", response_model=StationOut, status_code=201)
def create_station(
    payload: StationCreate,
    _: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Station:
    if db.scalar(select(Station).where(Station.name == payload.name)):
        raise HTTPException(409, f"Station '{payload.name}' already exists")
    station = Station(
        name=payload.name, location=payload.location, page_url=payload.page_url,
        enhancement_mode=payload.enhancement_mode,
    )
    db.add(station)
    db.commit()
    db.refresh(station)
    log.info("station created: %s (%s)", station.name, station.id)
    return station


@app.get("/api/stations/{sid}", response_model=StationOut)
def get_station(
    sid: str,
    _: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Station:
    station = db.get(Station, sid)
    if not station:
        raise HTTPException(404, "Station not found")
    return station


@app.patch("/api/stations/{sid}", response_model=StationOut)
def update_station(
    sid: str,
    payload: StationUpdate,
    _: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Station:
    station = db.get(Station, sid)
    if not station:
        raise HTTPException(404, "Station not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(station, field, value)
    db.commit()
    db.refresh(station)
    return station


@app.delete("/api/stations/{sid}", status_code=204, response_class=Response)
def delete_station(
    sid: str,
    _: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    station = db.get(Station, sid)
    if not station:
        raise HTTPException(404, "Station not found")
    db.delete(station)
    db.commit()
    log.info("station deleted: %s", sid)
    return Response(status_code=204)


# ── Recent events for one station ────────────────────────────────────────
@app.get("/api/stations/{sid}/recent-events", response_model=list[EventOut])
def station_recent_events(
    sid: str,
    _: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    minutes: int = Query(default=30, ge=1, le=1440),
    limit: int = Query(default=600, ge=1, le=5000),
) -> list[Event]:
    since = datetime.now(timezone.utc) - timedelta(minutes=minutes)
    return list(db.scalars(
        select(Event)
        .where(Event.station_id == sid, Event.ts >= since)
        .order_by(desc(Event.ts))
        .limit(limit)
    ))


# ── Preview JPEG (latest annotated frame for a station) ──────────────────
# Accepts the JWT via ?token=... query param so an <img> tag (which can't
# send Authorization headers) can authenticate. Same pattern as /api/ws/live.
@app.get("/api/stations/{sid}/preview", response_class=Response)
def station_preview(
    sid: str,
    token: Annotated[str | None, Query()] = None,
) -> Response:
    if not token:
        raise HTTPException(401, "Missing token query param")
    try:
        jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except JWTError as exc:
        raise HTTPException(401, "Invalid or expired token") from exc
    with preview_lock:
        data = preview_store.get(sid)
    if not data:
        raise HTTPException(404, "No preview frame yet")
    return Response(
        content=data, media_type="image/jpeg",
        headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"},
    )


# ── WebSocket live events ────────────────────────────────────────────────
@app.websocket("/api/ws/live")
async def ws_live(websocket: WebSocket) -> None:
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    try:
        jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except JWTError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()
    await ws_manager.connect(websocket)
    log.info("ws connected (total=%d)", len(ws_manager._connections))
    try:
        await websocket.send_json({"type": "hello"})
        while True:
            try:
                msg = await asyncio.wait_for(websocket.receive_text(), timeout=30)
                if msg == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                await websocket.send_json({"type": "ping"})
    except WebSocketDisconnect:
        pass
    finally:
        await ws_manager.disconnect(websocket)
        log.info("ws disconnected (total=%d)", len(ws_manager._connections))


# ─────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info", access_log=False)
