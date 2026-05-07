"""Diagnose what wds-native's StreamReader sees from the Pi camera.

Pulls 5 frames from the same URL using the same byte-scanner as vision.py,
saves them to ./diag_frame_*.jpg, and prints stats so we can see whether
decoded frames are actually black or contain real image data.
"""
import sys
import time
from pathlib import Path

import cv2
import numpy as np
import requests

PAGE_URL  = "http://192.168.4.136:8091/"   # same URL you put in the dashboard
OUT_DIR   = Path("diag_frames")
NUM_FRAMES = 5

# ─── Step 1 — discover stream URL (same logic as vision.StreamReader) ─────
print(f"[1/3] GET {PAGE_URL}")
r = requests.get(PAGE_URL, timeout=(5, 10))
r.raise_for_status()
ct = r.headers.get("Content-Type", "")
print(f"      Content-Type: {ct}")

if any(x in ct for x in ("multipart", "mjpeg", "mjpg")):
    stream_url = PAGE_URL
else:
    import re
    from urllib.parse import urljoin
    m = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', r.text, re.IGNORECASE)
    if not m:
        print("ERROR: no <img src> found in HTML")
        sys.exit(1)
    stream_url = urljoin(PAGE_URL, m.group(1))

print(f"      stream URL discovered: {stream_url}")

# ─── Step 2 — connect to MJPEG stream ─────────────────────────────────────
print(f"\n[2/3] GET {stream_url} (streaming)")
resp = requests.get(stream_url, stream=True, timeout=(5, 30))
resp.raise_for_status()
print(f"      status: {resp.status_code}")
print(f"      Content-Type: {resp.headers.get('Content-Type')}")

# ─── Step 3 — read N frames using the same byte scanner ───────────────────
print(f"\n[3/3] reading {NUM_FRAMES} frames...")
OUT_DIR.mkdir(exist_ok=True)
buf = b""
saved = 0
chunk_count = 0
t0 = time.time()

for chunk in resp.iter_content(chunk_size=8192):
    if not chunk:
        continue
    buf += chunk
    chunk_count += 1
    while True:
        a = buf.find(b"\xff\xd8")
        e = buf.find(b"\xff\xd9")
        if a == -1 or e <= a:
            break
        jpg = buf[a : e + 2]
        buf = buf[e + 2 :]
        img = cv2.imdecode(np.frombuffer(jpg, dtype=np.uint8), cv2.IMREAD_COLOR)
        if img is None:
            print(f"  frame {saved+1}: DECODE FAILED  raw_size={len(jpg)} bytes")
        else:
            mean = float(img.mean())
            shape = img.shape
            out = OUT_DIR / f"diag_frame_{saved+1:02d}.jpg"
            cv2.imwrite(str(out), img)
            print(
                f"  frame {saved+1}: shape={shape}  mean_brightness={mean:6.1f}/255"
                f"  raw_jpeg_size={len(jpg)} bytes  ->  {out}"
            )
        saved += 1
        if saved >= NUM_FRAMES:
            break
    if saved >= NUM_FRAMES:
        break

elapsed = time.time() - t0
print(f"\nDone in {elapsed:.1f}s. Read {chunk_count} chunks, decoded {saved} frames.")
print(f"Frames saved to: {OUT_DIR.resolve()}")
print()
print("Interpretation:")
print("  mean_brightness near 0       → frames are actually black (camera/Pi issue)")
print("  mean_brightness 50-150       → frames have real image content (decoding works)")
print("  DECODE FAILED                → byte parser returning corrupt JPEGs")
