from typing import Annotated

from pydantic import BaseModel, Field


class ImageEmbedding(BaseModel):
    embedding: list[float]
    dimensions: int
    model: str


class CachedEmbeddingsRequest(BaseModel):
    image_ids: list[
        Annotated[str, Field(min_length=1, max_length=36)]
    ] = Field(min_length=1, max_length=100)


class CachedEmbeddingsResponse(BaseModel):
    embeddings: dict[str, ImageEmbedding]