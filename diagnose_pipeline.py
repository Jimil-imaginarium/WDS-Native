"""End-to-end pipeline diagnostic.

Uses the same StreamReader + MediaPipeHands classes that wds-native uses.
Tells us exactly which stage is failing.

IMPORTANT: stop the running wds-native server before running this
(close the WDS Server cmd window). Otherwise both processes will fight for
the same stream.
"""
import logging
import time
from pathlib import Path

import cv2

from vision import StreamReader, MediaPipeHands, apply_enhancement, classify_grip, HOLDING_GRIPS

logging.basicConfig(level=logging.DEBUG, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

PAGE_URL = "http://192.168.4.136:8091/"
OUT_DIR  = Path("diag_pipeline")
OUT_DIR.mkdir(exist_ok=True)

print(f"[1/4] Starting StreamReader for {PAGE_URL}")
reader = StreamReader(PAGE_URL)
reader.start()

print("[2/4] Waiting up to 10 s for first frame...")
frame = None
t0 = time.time()
while time.time() - t0 < 10:
    frame = reader.latest()
    if frame is not None:
        break
    time.sleep(0.1)

if frame is None:
    print(f"  FAIL — no frame after 10 s. reader.alive = {reader.alive}")
    reader.stop()
    raise SystemExit(1)

print(f"  OK — got frame after {time.time() - t0:.1f} s")
print(f"  shape = {frame.shape}  mean_brightness = {float(frame.mean()):.1f}/255")
cv2.imwrite(str(OUT_DIR / "01_raw_frame.jpg"), frame)

print("\n[3/4] Loading MediaPipe HandLandmarker...")
detector = MediaPipeHands()
print("  OK")

print("\n[4/4] Running detection on next 10 frames...")
for i in range(10):
    frame = reader.latest()
    if frame is None:
        print(f"  iter {i+1}: frame is None")
        time.sleep(0.2)
        continue
    enhanced = apply_enhancement(frame, "off")
    try:
        hands = detector.detect(enhanced)
    except Exception as exc:
        print(f"  iter {i+1}: detect() RAISED {type(exc).__name__}: {exc}")
        continue

    n = len(hands)
    grips = [h.grip.value for h in hands]
    holding = any(h.grip in HOLDING_GRIPS for h in hands)
    bright = float(frame.mean())
    print(
        f"  iter {i+1}: n_hands={n}  grips={grips}  any_holding={holding}  "
        f"mean_bright={bright:.1f}"
    )
    cv2.imwrite(str(OUT_DIR / f"frame_{i+1:02d}.jpg"), frame)
    time.sleep(0.3)

print("\nCleanup...")
detector.close()
reader.stop()

print(f"\nDone. Frames saved to {OUT_DIR.resolve()}")
print()
print("Interpretation:")
print("  n_hands == 0 every frame  → MediaPipe isn't seeing hands (lighting/angle/glove issue)")
print("  detect() RAISES           → MediaPipe is the bug; we'll fix it")
print("  mean_bright near 0        → frames are black even though raw GET wasn't")
