import pytest

from pydantic import (
    ValidationError,
)

from app.schemas.search import (
    MAX_SEMANTIC_SEARCH_ITEMS,
    SemanticSearchItem,
    SemanticSearchRequest,
)


def create_search_items(
    count: int,
) -> list[
    SemanticSearchItem
]:
    return [
        SemanticSearchItem(
            id=f"image-{index}",
            title=f"Image {index}",
            text=(
                "Creative visual "
                "reference metadata."
            ),
        )

        for index
        in range(
            count
        )
    ]


def test_semantic_search_accepts_maximum_items():
    request = (
        SemanticSearchRequest(
            query=(
                "cinematic lighting"
            ),
            items=(
                create_search_items(
                    MAX_SEMANTIC_SEARCH_ITEMS
                )
            ),
        )
    )

    assert (
        len(
            request.items
        )
        ==
        MAX_SEMANTIC_SEARCH_ITEMS
    )


def test_semantic_search_rejects_too_many_items():
    with pytest.raises(
        ValidationError,
    ):
        SemanticSearchRequest(
            query=(
                "cinematic lighting"
            ),
            items=(
                create_search_items(
                    MAX_SEMANTIC_SEARCH_ITEMS
                    + 1
                )
            ),
        )