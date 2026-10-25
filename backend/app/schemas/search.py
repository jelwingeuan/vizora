from pydantic import (
    BaseModel,
    Field,
)


class SemanticSearchRequest(
    BaseModel,
):
    query: str = Field(
        min_length=1,
        max_length=500,
    )


class SearchResult(
    BaseModel,
):
    id: str

    score: float


class SearchResponse(
    BaseModel,
):
    results: list[
        SearchResult
    ]
