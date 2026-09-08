import os

from pathlib import (
    Path,
)

from dotenv import (
    load_dotenv,
)


PROJECT_ROOT = (
    Path(__file__)
    .resolve()
    .parents[3]
)


BACKEND_ROOT = (
    Path(__file__)
    .resolve()
    .parents[2]
)


load_dotenv(
    BACKEND_ROOT
    / ".env",
)


def resolve_storage_directory() -> Path:
    configured_path = (
        os.getenv(
            "VIZORA_STORAGE_DIR",
            "",
        )
        .strip()
    )

    if not configured_path:
        return (
            PROJECT_ROOT
            / "storage"
        )

    storage_path = (
        Path(
            configured_path
        )
        .expanduser()
    )

    if not (
        storage_path.is_absolute()
    ):
        storage_path = (
            PROJECT_ROOT
            / storage_path
        )

    return (
        storage_path.resolve()
    )


STORAGE_DIR = (
    resolve_storage_directory()
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