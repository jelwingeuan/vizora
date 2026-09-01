from datetime import datetime

from pydantic import (
    BaseModel,
    Field,
)

from app.schemas.analysis import (
    ImageAnalysis,
)


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

    analysis: (
        ImageAnalysis
        | None
    ) = None


class ImageFavoriteUpdate(
    BaseModel,
):
    is_favorite: bool


class ImageFavoriteResponse(
    BaseModel,
):
    id: str

    is_favorite: bool


class ImageTitleUpdate(
    BaseModel,
):
    title: str = Field(
        min_length=1,
        max_length=255,
    )


class ImageTitleResponse(
    BaseModel,
):
    id: str

    title: str