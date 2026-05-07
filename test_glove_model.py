"""Quick sanity check: load models/hands.pt and run it on a saved Pi frame.

Run this AFTER you drop best.pt → models/hands.pt:

    venv\\Scripts\\activate
    python test_glove_model.py

What it does:
  1. Loads the model (fails loudly if file missing or corrupt)
  2. Prints class names so we see what was trained (should be ['glove', 'person'])
  3. Runs prediction on the most recent frame from diag_pipeline/ or diag_frames/
  4. Prints detections with confidence
  5. Saves an annotated image to test_glove_result.jpg so you can eyeball it

If output shows glove(s) and/or person detected with conf > 0.5 on a frame
that visually has a worker in gloves → model is good, we proceed to integrate.
"""
import glob
import sys
from pathlib import Path

import cv2

MODEL_PATH = "models/hands.pt"
OUTPUT_IMG = "test_glove_result.jpg"

# 1. Find a test frame on disk
candidates = sorted(
    glob.glob("diag_pipeline/*.jpg") + glob.glob("diag_frames/*.jpg")
)
if not candidates:
    print("ERROR: no diagnostic frame on disk.")
    print("  Run `python diagnose_pipeline.py` first to capture a Pi frame.")
    sys.exit(1)

test_img = candidates[-1]   # latest

# 2. Verify model file
if not Path(MODEL_PATH).exists():
    print(f"ERROR: {MODEL_PATH} not found.")
    print("  Download best.pt from Colab and place at this path.")
    sys.exit(1)

# 3. Load model
print(f"Loading {MODEL_PATH}...")
from ultralytics import YOLO
model = YOLO(MODEL_PATH)
print(f"  classes : {model.names}")
print(f"  test on : {test_img}")
print()

# 4. Run prediction
result = model.predict(test_img, conf=0.25, verbose=False)[0]
n = len(result.boxes) if result.boxes is not None else 0

print(f"Detections: {n}")
if result.boxes is not None:
    for b in result.boxes:
        cls   = int(b.cls.item())
        conf  = float(b.conf.item())
        x1, y1, x2, y2 = [int(v) for v in b.xyxy[0].tolist()]
        name = model.names[cls]
        print(f"  {name:<8} conf={conf:.2f}  bbox=({x1},{y1})-({x2},{y2})")

# 5. Save annotated frame
annotated = result.plot()
cv2.imwrite(OUTPUT_IMG, annotated)
print(f"\nAnnotated frame written to: {Path(OUTPUT_IMG).resolve()}")
print()
print("Open that image and verify boxes are on the actual gloves/people.")
print("If yes  → tell me, and I'll wire it into vision.py.")
print("If no   → tell me what went wrong (no boxes? wrong objects? low conf?).")
