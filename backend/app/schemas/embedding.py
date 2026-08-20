from pydantic import BaseModel


class ImageEmbedding(BaseModel):
    embedding: list[float]
    dimensions: int
    model: str