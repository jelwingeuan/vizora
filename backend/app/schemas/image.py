from datetime import datetime

from pydantic import BaseModel


class StoredImageResponse(
    BaseModel,
):
    id: str
    title: str
    url: str

    original_filename: str

    file_size: int

    width: int
    height: int

    source: str

    is_favorite: bool

    created_at: datetime