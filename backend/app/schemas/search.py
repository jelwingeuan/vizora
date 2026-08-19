from pydantic import BaseModel, Field


class SemanticSearchItem(BaseModel):
    id: str
    title: str
    text: str


class SemanticSearchRequest(BaseModel):
    query: str = Field(
        min_length=1,
        max_length=500,
    )

    items: list[SemanticSearchItem] = Field(
        min_length=1,
        max_length=100,
    )


class SemanticSearchResult(BaseModel):
    id: str
    score: float


class SemanticSearchResponse(BaseModel):
    results: list[SemanticSearchResult]