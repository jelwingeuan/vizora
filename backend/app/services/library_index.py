"""
Semantic search and visual similarity over the stored library.

Callers pass a query or a source image and get back ranked public
image IDs. Search documents, cached text and image embeddings, and
scoring all stay inside this module. Embeddings are created lazily
and are reused until the image's search document or the configured
embedding model changes.
"""

import hashlib
import os
import re

from concurrent.futures import (
    ThreadPoolExecutor,
)

from dataclasses import (
    dataclass,
)

from sqlalchemy import (
    select,
)

from sqlalchemy.orm import (
    Session,
)

from app.models.image import (
    Image,
)

from app.models.image_embedding import (
    ImageEmbeddingRecord,
)

from app.models.image_text_embedding import (
    ImageTextEmbeddingRecord,
)

from app.schemas.analysis import (
    ImageAnalysis,
)

from app.services.analysis_store_service import (
    get_image_analyses,
)

from app.services.image_service import (
    list_stored_images,
    read_stored_image_bytes,
)

from app.services.visual_ai import (
    AIConfigurationError,
    AIServiceError,
    VisualAI,
)


MAX_SEARCH_RESULTS = 12

MAX_DOCUMENT_CHARACTERS = 4000

DEFAULT_MIN_SEARCH_SCORE = 0.42

DEFAULT_SEARCH_SCORE_WINDOW = 0.18

SEMANTIC_WEIGHT = 0.82

LEXICAL_WEIGHT = 0.12

TITLE_WEIGHT = 0.06


MAX_SIMILAR_RESULTS = 8

MIN_SIMILARITY_SCORE = 0.5

SIMILARITY_SCORE_WINDOW = 0.14

IMAGE_EMBEDDING_WORKERS = 4


class SearchConfigurationError(
    RuntimeError,
):
    pass


class LibraryIndexError(
    RuntimeError,
):
    pass


@dataclass(
    frozen=True,
    slots=True,
)
class RankedImage:
    id: str

    score: float


def search_library(
    database: Session,
    ai: VisualAI,
    query: str,
) -> list[RankedImage]:
    """
    Rank stored images against a natural-language query.

    Raises SearchConfigurationError for invalid score settings,
    AI errors from the provider, and LibraryIndexError when cached
    embeddings cannot be saved.
    """

    minimum_score = get_score_setting(
        "SEMANTIC_SEARCH_MIN_SCORE",
        DEFAULT_MIN_SEARCH_SCORE,
    )

    score_window = get_score_setting(
        "SEMANTIC_SEARCH_SCORE_WINDOW",
        DEFAULT_SEARCH_SCORE_WINDOW,
    )

    normalized_query = normalize_text(
        query,
    )

    images = list_stored_images(
        database,
    )

    if (
        not normalized_query
        or not images
    ):
        return []

    analyses = get_image_analyses(
        database,
        [
            image.id
            for image in images
        ],
    )

    documents = {
        image.id: create_search_document(
            image,
            analyses.get(
                image.id,
            ),
        )
        for image in images
    }

    document_embeddings = (
        ensure_text_embeddings(
            database,
            ai,
            documents,
        )
    )

    [query_embedding] = ai.embed_texts(
        [normalized_query],
        "query",
    )

    scores = [
        RankedImage(
            id=image.public_id,

            score=round(
                combine_scores(
                    semantic_score=dot(
                        query_embedding,
                        document_embeddings[
                            image.id
                        ],
                    ),

                    lexical_score=lexical_score(
                        normalized_query,
                        documents[
                            image.id
                        ],
                    ),

                    title_score=lexical_score(
                        normalized_query,
                        image.title,
                    ),
                ),
                6,
            ),
        )
        for image in images
    ]

    return select_top_matches(
        scores,
        minimum_score=minimum_score,
        score_window=score_window,
        limit=MAX_SEARCH_RESULTS,
    )


def find_similar_images(
    database: Session,
    ai: VisualAI,
    source: Image,
) -> list[RankedImage]:
    """
    Rank other stored images by visual similarity to `source`.

    Candidates whose embedding cannot be created are skipped. Raises
    the underlying error when the source itself cannot be embedded
    or the provider is not configured, and AIServiceError when no
    candidate could be embedded.
    """

    images = list_stored_images(
        database,
    )

    candidates = [
        image
        for image in images
        if image.id != source.id
    ]

    if not candidates:
        return []

    embeddings = ensure_image_embeddings(
        database,
        ai,
        images,
        required=source,
    )

    scores = [
        RankedImage(
            id=candidate.public_id,

            score=round(
                dot(
                    embeddings[
                        source.id
                    ],
                    embeddings[
                        candidate.id
                    ],
                ),
                6,
            ),
        )
        for candidate in candidates
        if candidate.id in embeddings
    ]

    if not scores:
        raise AIServiceError(
            "Unable to generate comparison embeddings."
        )

    return select_top_matches(
        scores,
        minimum_score=MIN_SIMILARITY_SCORE,
        score_window=SIMILARITY_SCORE_WINDOW,
        limit=MAX_SIMILAR_RESULTS,
    )


def ensure_text_embeddings(
    database: Session,
    ai: VisualAI,
    documents: dict[int, str],
) -> dict[int, list[float]]:
    records = {
        record.image_id: record
        for record in database.scalars(
            select(
                ImageTextEmbeddingRecord,
            ).where(
                ImageTextEmbeddingRecord.image_id
                .in_(
                    documents,
                )
            )
        )
    }

    hashes = {
        image_id: hash_document(
            document,
        )
        for image_id, document
        in documents.items()
    }

    stale_ids = [
        image_id
        for image_id in documents
        if not (
            is_current(
                records.get(
                    image_id,
                ),
                model=ai.text_embedding_model,
                dimensions=ai.embedding_dimensions,
            )
            and records[
                image_id
            ].document_hash
            == hashes[
                image_id
            ]
        )
    ]

    if stale_ids:
        vectors = ai.embed_texts(
            [
                documents[image_id]
                for image_id in stale_ids
            ],
            "document",
        )

        try:
            for image_id, vector in zip(
                stale_ids,
                vectors,
                strict=True,
            ):
                record = records.get(
                    image_id,
                )

                if record is None:
                    record = ImageTextEmbeddingRecord(
                        image_id=image_id,
                    )

                    database.add(
                        record,
                    )

                    records[
                        image_id
                    ] = record

                record.embedding = vector
                record.dimensions = len(vector)
                record.model = ai.text_embedding_model
                record.document_hash = hashes[
                    image_id
                ]

            database.commit()

        except Exception as error:
            database.rollback()

            raise LibraryIndexError(
                "Unable to save search embeddings."
            ) from error

    return {
        image_id: list(
            records[image_id].embedding,
        )
        for image_id in documents
    }


def ensure_image_embeddings(
    database: Session,
    ai: VisualAI,
    images: list[Image],
    required: Image,
) -> dict[int, list[float]]:
    records = {
        record.image_id: record
        for record in database.scalars(
            select(
                ImageEmbeddingRecord,
            ).where(
                ImageEmbeddingRecord.image_id
                .in_(
                    [
                        image.id
                        for image in images
                    ],
                )
            )
        )
    }

    missing = [
        image
        for image in images
        if not is_current(
            records.get(
                image.id,
            ),
            model=ai.image_embedding_model,
            dimensions=ai.embedding_dimensions,
        )
    ]

    def embed(
        image: Image,
    ) -> list[float] | Exception:
        try:
            return ai.embed_image(
                read_stored_image_bytes(
                    image,
                ),
                image.mime_type,
            )

        except Exception as error:
            return error

    with ThreadPoolExecutor(
        max_workers=IMAGE_EMBEDDING_WORKERS,
    ) as pool:
        outcomes = list(
            pool.map(
                embed,
                missing,
            )
        )

    created = {
        image.id: outcome
        for image, outcome in zip(
            missing,
            outcomes,
            strict=True,
        )
        if not isinstance(
            outcome,
            Exception,
        )
    }

    for image, outcome in zip(
        missing,
        outcomes,
        strict=True,
    ):
        if isinstance(
            outcome,
            AIConfigurationError,
        ) or (
            image.id == required.id
            and isinstance(
                outcome,
                Exception,
            )
        ):
            raise outcome

    if created:
        try:
            for image_id, vector in created.items():
                record = records.get(
                    image_id,
                )

                if record is None:
                    record = ImageEmbeddingRecord(
                        image_id=image_id,
                    )

                    database.add(
                        record,
                    )

                    records[
                        image_id
                    ] = record

                record.embedding = vector
                record.dimensions = len(vector)
                record.model = ai.image_embedding_model

            database.commit()

        except Exception as error:
            database.rollback()

            raise LibraryIndexError(
                "Unable to save image embeddings."
            ) from error

    missing_ids = {
        image.id
        for image in missing
    }

    return {
        image.id: list(
            records[image.id].embedding,
        )
        for image in images
        if image.id not in missing_ids
        or image.id in created
    }


def is_current(
    record: (
        ImageEmbeddingRecord
        | ImageTextEmbeddingRecord
        | None
    ),
    model: str,
    dimensions: int,
) -> bool:
    return (
        record is not None
        and record.model == model
        and record.dimensions == dimensions
        and len(record.embedding) == dimensions
    )


def create_search_document(
    image: Image,
    analysis: ImageAnalysis | None,
) -> str:
    sections = [
        f"Title: {normalize_text(image.title)}",
    ]

    if analysis:
        sections.extend(
            [
                f"Summary: {analysis.summary}",
                f"Subject: {analysis.subject}",
                f"Style: {', '.join(analysis.style)}",
                f"Mood: {', '.join(analysis.mood)}",
                f"Lighting: {analysis.lighting}",
                f"Composition: {analysis.composition}",
                f"AI tags: {', '.join(analysis.tags)}",
                f"Creative notes: {analysis.creative_notes}",
            ]
        )

    return "\n".join(
        sections,
    )[
        :MAX_DOCUMENT_CHARACTERS
    ]


def hash_document(
    document: str,
) -> str:
    return hashlib.sha256(
        document.encode(
            "utf-8",
        ),
    ).hexdigest()


def select_top_matches(
    scores: list[RankedImage],
    minimum_score: float,
    score_window: float,
    limit: int,
) -> list[RankedImage]:
    """
    Keep only matches close to the best one, so weak matches are
    dropped instead of always filling `limit` results.
    """

    ranked = sorted(
        scores,
        key=lambda result: result.score,
        reverse=True,
    )

    if (
        not ranked
        or ranked[0].score < minimum_score
    ):
        return []

    threshold = max(
        minimum_score,
        ranked[0].score - score_window,
    )

    return [
        result
        for result in ranked
        if result.score >= threshold
    ][
        :limit
    ]


def combine_scores(
    semantic_score: float,
    lexical_score: float,
    title_score: float,
) -> float:
    return (
        clamp_score(semantic_score)
        * SEMANTIC_WEIGHT
        + clamp_score(lexical_score)
        * LEXICAL_WEIGHT
        + clamp_score(title_score)
        * TITLE_WEIGHT
    )


def lexical_score(
    query: str,
    document: str,
) -> float:
    normalized_query = normalize_text(
        query,
    ).casefold()

    normalized_document = normalize_text(
        document,
    ).casefold()

    query_terms = tokenize(
        normalized_query,
    )

    if (
        not query_terms
        or not normalized_document
    ):
        return 0.0

    term_coverage = (
        len(
            query_terms
            & tokenize(
                normalized_document,
            )
        )
        / len(query_terms)
    )

    phrase_match = (
        1.0
        if normalized_query
        in normalized_document
        else 0.0
    )

    return min(
        1.0,
        term_coverage * 0.8
        + phrase_match * 0.2,
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
        value.split()
    )


def dot(
    first: list[float],
    second: list[float],
) -> float:
    return sum(
        first_value * second_value
        for first_value, second_value
        in zip(
            first,
            second,
            strict=True,
        )
    )


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


def get_score_setting(
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
