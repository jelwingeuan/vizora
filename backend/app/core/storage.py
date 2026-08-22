from pathlib import Path


PROJECT_ROOT = (
    Path(__file__)
    .resolve()
    .parents[3]
)

STORAGE_DIR = (
    PROJECT_ROOT
    / "storage"
)

UPLOADS_DIR = (
    STORAGE_DIR
    / "uploads"
)


STORAGE_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

UPLOADS_DIR.mkdir(
    parents=True,
    exist_ok=True,
)