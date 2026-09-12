from pydantic import (
    BaseModel,
    Field,
)


MAX_SEMANTIC_SEARCH_ITEMS = (
    250
)


class SemanticSearchItem(
    BaseModel,
):
    id: str = Field(
        min_length=1,
        max_length=128,
    )

    title: str = Field(
        min_length=1,
        max_length=255,
    )

    text: str = Field(
        min_length=1,
        max_length=6000,
    )


class SemanticSearchRequest(
    BaseModel,
):
    query: str = Field(
        min_length=1,
        max_length=500,
    )

    items: list[
        SemanticSearchItem
    ] = Field(
        min_length=1,
        max_length=(
            MAX_SEMANTIC_SEARCH_ITEMS
        ),
    )


class SemanticSearchResult(
    BaseModel,
):
    id: str
    score: float


class SemanticSearchResponse(
    BaseModel,
):
    results: list[
        SemanticSearchResult
    ]
