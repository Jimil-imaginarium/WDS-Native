"""pytest config — adds the wds-native repo root to sys.path so
   `from vision import ...` works regardless of where pytest is run from.
"""
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))
