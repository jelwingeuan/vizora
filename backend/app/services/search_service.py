import math
import os

from google import genai
from google.genai import types

from app.schemas.search import (
    SemanticSearchItem,
    SemanticSearchResult,
)


DEFAULT_EMBEDDING_MODEL = (
    "gemini-embedding-001"
)

EMBEDDING_DIMENSIONS = 768

MAX_RESULTS = 12


class SearchConfigurationError(
    RuntimeError,
):
    pass


class SemanticSearchError(
    RuntimeError,
):
    pass


async def semantic_search(
    query: str,
    items: list[SemanticSearchItem],
) -> list[SemanticSearchResult]:
    api_key = os.getenv(
        "GEMINI_API_KEY",
    )

    if not api_key:
        raise SearchConfigurationError(
            "GEMINI_API_KEY is not configured."
        )

    model = os.getenv(
        "GEMINI_EMBEDDING_MODEL",
        DEFAULT_EMBEDDING_MODEL,
    )

    client = genai.Client(
        api_key=api_key,
    )

    documents = [
        create_search_document(item)
        for item in items
    ]

    try:
        query_response = (
            await client.aio.models.embed_content(
                model=model,
                contents=query,
                config=types.EmbedContentConfig(
                    task_type=(
                        "RETRIEVAL_QUERY"
                    ),
                    output_dimensionality=(
                        EMBEDDING_DIMENSIONS
                    ),
                ),
            )
        )

        document_response = (
            await client.aio.models.embed_content(
                model=model,
                contents=documents,
                config=types.EmbedContentConfig(
                    task_type=(
                        "RETRIEVAL_DOCUMENT"
                    ),
                    output_dimensionality=(
                        EMBEDDING_DIMENSIONS
                    ),
                ),
            )
        )

        query_embedding = (
            get_first_embedding(
                query_response.embeddings,
            )
        )

        if not document_response.embeddings:
            raise SemanticSearchError(
                "Gemini returned no document embeddings."
            )

        if (
            len(document_response.embeddings)
            != len(items)
        ):
            raise SemanticSearchError(
                "Gemini returned an unexpected "
                "number of embeddings."
            )

        results: list[
            SemanticSearchResult
        ] = []

        for item, embedding in zip(
            items,
            document_response.embeddings,
            strict=True,
        ):
            if not embedding.values:
                continue

            score = cosine_similarity(
                query_embedding,
                embedding.values,
            )

            results.append(
                SemanticSearchResult(
                    id=item.id,
                    score=round(
                        score,
                        6,
                    ),
                )
            )

        results.sort(
            key=lambda result: result.score,
            reverse=True,
        )

        return results[:MAX_RESULTS]

    except (
        SearchConfigurationError,
        SemanticSearchError,
    ):
        raise

    except Exception as error:
        raise SemanticSearchError(
            "Semantic search failed."
        ) from error

    finally:
        await client.aio.aclose()


def create_search_document(
    item: SemanticSearchItem,
) -> str:
    return (
        f"Title: {item.title}\n"
        f"{item.text}"
    )


def get_first_embedding(
    embeddings,
) -> list[float]:
    if not embeddings:
        raise SemanticSearchError(
            "Gemini returned no query embedding."
        )

    embedding = embeddings[0]

    if not embedding.values:
        raise SemanticSearchError(
            "Gemini returned an empty query "
            "embedding."
        )

    return embedding.values


def cosine_similarity(
    first: list[float],
    second: list[float],
) -> float:
    if len(first) != len(second):
        raise SemanticSearchError(
            "Embedding dimensions do not match."
        )

    dot_product = sum(
        first_value * second_value
        for first_value, second_value in zip(
            first,
            second,
            strict=True,
        )
    )

    first_magnitude = math.sqrt(
        sum(
            value * value
            for value in first
        )
    )

    second_magnitude = math.sqrt(
        sum(
            value * value
            for value in second
        )
    )

    if (
        first_magnitude == 0
        or second_magnitude == 0
    ):
        return 0.0

    return (
        dot_product
        / (
            first_magnitude
            * second_magnitude
        )
    )