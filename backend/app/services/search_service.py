import asyncio
import math
import os
import re

from dotenv import (
    load_dotenv,
)

from google import genai

from google.genai import (
    types,
)

from app.schemas.search import (
    SemanticSearchItem,
    SemanticSearchResult,
)


load_dotenv()


DEFAULT_EMBEDDING_MODEL = (
    "gemini-embedding-001"
)

EMBEDDING_DIMENSIONS = 768

MAX_RESULTS = 12

DOCUMENT_BATCH_SIZE = 24

MAX_DOCUMENT_CHARACTERS = 4000


DEFAULT_MIN_RESULT_SCORE = 0.42

DEFAULT_SCORE_WINDOW = 0.18


SEMANTIC_WEIGHT = 0.82

LEXICAL_WEIGHT = 0.12

TITLE_WEIGHT = 0.06


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
    items: list[
        SemanticSearchItem
    ],
) -> list[
    SemanticSearchResult
]:
    return await asyncio.to_thread(
        _semantic_search_sync,
        query,
        items,
    )


def _semantic_search_sync(
    query: str,
    items: list[
        SemanticSearchItem
    ],
) -> list[
    SemanticSearchResult
]:
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

    minimum_score = (
        get_float_setting(
            name=(
                "SEMANTIC_SEARCH_MIN_SCORE"
            ),
            default=(
                DEFAULT_MIN_RESULT_SCORE
            ),
        )
    )

    score_window = (
        get_float_setting(
            name=(
                "SEMANTIC_SEARCH_SCORE_WINDOW"
            ),
            default=(
                DEFAULT_SCORE_WINDOW
            ),
        )
    )

    normalized_query = (
        normalize_text(
            query,
        )
    )

    prepared_items = (
        prepare_search_items(
            items,
        )
    )

    if not prepared_items:
        return []

    documents = [
        create_search_document(
            item,
        )
        for item
        in prepared_items
    ]

    client = genai.Client(
        api_key=api_key,
    )

    try:
        query_response = (
            client.models.embed_content(
                model=model,

                contents=(
                    normalized_query
                ),

                config=(
                    types.EmbedContentConfig(
                        task_type=(
                            "RETRIEVAL_QUERY"
                        ),

                        output_dimensionality=(
                            EMBEDDING_DIMENSIONS
                        ),
                    )
                ),
            )
        )

        query_embedding = (
            get_first_embedding(
                query_response.embeddings,
            )
        )

        document_embeddings = (
            embed_documents(
                client=client,

                model=model,

                documents=documents,
            )
        )

        if (
            len(document_embeddings)
            != len(prepared_items)
        ):
            raise SemanticSearchError(
                "Gemini returned an unexpected "
                "number of document embeddings."
            )

        scored_results: list[
            SemanticSearchResult
        ] = []

        for (
            item,
            document,
            embedding,
        ) in zip(
            prepared_items,
            documents,
            document_embeddings,
            strict=True,
        ):
            if not embedding.values:
                continue

            semantic_score = (
                cosine_similarity(
                    query_embedding,
                    embedding.values,
                )
            )

            lexical_score = (
                calculate_lexical_score(
                    normalized_query,
                    document,
                )
            )

            title_score = (
                calculate_lexical_score(
                    normalized_query,
                    item.title,
                )
            )

            combined_score = (
                calculate_combined_score(
                    semantic_score=(
                        semantic_score
                    ),

                    lexical_score=(
                        lexical_score
                    ),

                    title_score=(
                        title_score
                    ),
                )
            )

            scored_results.append(
                SemanticSearchResult(
                    id=item.id,

                    score=round(
                        combined_score,
                        6,
                    ),
                )
            )

        if not scored_results:
            return []

        scored_results.sort(
            key=lambda result:
                result.score,

            reverse=True,
        )

        top_score = (
            scored_results[
                0
            ].score
        )

        if (
            top_score
            < minimum_score
        ):
            return []

        adaptive_threshold = max(
            minimum_score,

            top_score
            - score_window,
        )

        filtered_results = [
            result

            for result
            in scored_results

            if (
                result.score
                >= adaptive_threshold
            )
        ]

        return filtered_results[
            :MAX_RESULTS
        ]

    except (
        SearchConfigurationError,
        SemanticSearchError,
    ):
        raise

    except Exception as error:
        raise SemanticSearchError(
            "Semantic search failed: "
            f"{type(error).__name__}: "
            f"{error}"
        ) from error

    finally:
        client.close()


def prepare_search_items(
    items: list[
        SemanticSearchItem
    ],
) -> list[
    SemanticSearchItem
]:
    prepared_items: list[
        SemanticSearchItem
    ] = []

    seen_ids: set[str] = set()

    for item in items:
        if item.id in seen_ids:
            continue

        seen_ids.add(
            item.id,
        )

        normalized_title = (
            normalize_text(
                item.title,
            )
        )

        normalized_text = (
            normalize_text(
                item.text,
            )
        )

        if (
            not normalized_title
            and not normalized_text
        ):
            continue

        prepared_items.append(
            SemanticSearchItem(
                id=item.id,

                title=(
                    normalized_title
                    or "Untitled reference"
                ),

                text=(
                    normalized_text
                    or "No additional metadata."
                ),
            )
        )

    return prepared_items


def create_search_document(
    item: SemanticSearchItem,
) -> str:
    title = normalize_text(
        item.title,
    )

    body = normalize_text(
        item.text,
    )

    document = (
        f"Title: {title}\n"
        f"Visual metadata: {body}"
    )

    return document[
        :MAX_DOCUMENT_CHARACTERS
    ]


def embed_documents(
    client,
    model: str,
    documents: list[str],
):
    embeddings = []

    for start_index in range(
        0,
        len(documents),
        DOCUMENT_BATCH_SIZE,
    ):
        batch = documents[
            start_index:
            start_index
            + DOCUMENT_BATCH_SIZE
        ]

        response = (
            client.models.embed_content(
                model=model,

                contents=batch,

                config=(
                    types.EmbedContentConfig(
                        task_type=(
                            "RETRIEVAL_DOCUMENT"
                        ),

                        output_dimensionality=(
                            EMBEDDING_DIMENSIONS
                        ),
                    )
                ),
            )
        )

        if not response.embeddings:
            raise SemanticSearchError(
                "Gemini returned no "
                "document embeddings."
            )

        if (
            len(response.embeddings)
            != len(batch)
        ):
            raise SemanticSearchError(
                "Gemini returned an unexpected "
                "number of document embeddings."
            )

        embeddings.extend(
            response.embeddings,
        )

    return embeddings


def calculate_combined_score(
    semantic_score: float,
    lexical_score: float,
    title_score: float,
) -> float:
    semantic_score = clamp_score(
        semantic_score,
    )

    lexical_score = clamp_score(
        lexical_score,
    )

    title_score = clamp_score(
        title_score,
    )

    return (
        (
            semantic_score
            * SEMANTIC_WEIGHT
        )
        +
        (
            lexical_score
            * LEXICAL_WEIGHT
        )
        +
        (
            title_score
            * TITLE_WEIGHT
        )
    )


def calculate_lexical_score(
    query: str,
    document: str,
) -> float:
    normalized_query = (
        normalize_text(
            query,
        ).casefold()
    )

    normalized_document = (
        normalize_text(
            document,
        ).casefold()
    )

    if (
        not normalized_query
        or not normalized_document
    ):
        return 0.0

    query_terms = (
        tokenize(
            normalized_query,
        )
    )

    document_terms = (
        tokenize(
            normalized_document,
        )
    )

    if not query_terms:
        return 0.0

    matching_terms = (
        query_terms
        .intersection(
            document_terms,
        )
    )

    term_coverage = (
        len(matching_terms)
        / len(query_terms)
    )

    phrase_match = (
        1.0
        if (
            normalized_query
            in normalized_document
        )
        else 0.0
    )

    return min(
        1.0,

        (
            term_coverage
            * 0.8
        )
        +
        (
            phrase_match
            * 0.2
        ),
    )


def tokenize(
    value: str,
) -> set[str]:
    return set(
        re.findall(
            r"\w+",
            value.casefold(),
        )
    )


def normalize_text(
    value: str,
) -> str:
    return " ".join(
        value
        .strip()
        .split()
    )


def get_float_setting(
    name: str,
    default: float,
) -> float:
    raw_value = os.getenv(
        name,
    )

    if (
        raw_value is None
        or not raw_value.strip()
    ):
        return default

    try:
        value = float(
            raw_value,
        )

    except ValueError as error:
        raise SearchConfigurationError(
            f"{name} must be a number."
        ) from error

    if not (
        0.0
        <= value
        <= 1.0
    ):
        raise SearchConfigurationError(
            f"{name} must be between "
            "0 and 1."
        )

    return value


def clamp_score(
    score: float,
) -> float:
    return max(
        0.0,
        min(
            1.0,
            score,
        ),
    )


def get_first_embedding(
    embeddings,
) -> list[float]:
    if not embeddings:
        raise SemanticSearchError(
            "Gemini returned no "
            "query embedding."
        )

    embedding = embeddings[
        0
    ]

    if not embedding.values:
        raise SemanticSearchError(
            "Gemini returned an empty "
            "query embedding."
        )

    return embedding.values


def cosine_similarity(
    first: list[float],
    second: list[float],
) -> float:
    if (
        len(first)
        != len(second)
    ):
        raise SemanticSearchError(
            "Embedding dimensions "
            "do not match."
        )

    dot_product = sum(
        first_value
        * second_value

        for (
            first_value,
            second_value,
        )
        in zip(
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
        /
        (
            first_magnitude
            * second_magnitude
        )
    )