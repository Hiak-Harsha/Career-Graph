import sys
from pathlib import Path

# Ensure root directory and backend directory are always resolvable
_repo_root = str(Path(__file__).resolve().parent.parent)
_backend_dir = str(Path(__file__).resolve().parent)
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)
