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

from app.schemas.embedding import (
    ImageEmbedding,
)


class EmbeddingStorageError(
    RuntimeError,
):
    pass


def get_stored_image_embedding(
    database: Session,
    image: Image,
    model: str,
    dimensions: int,
) -> ImageEmbedding | None:
    statement = (
        select(
            ImageEmbeddingRecord,
        )
        .where(
            ImageEmbeddingRecord.image_id
            == image.id,
        )
    )

    record = database.scalar(
        statement,
    )

    return to_image_embedding(
        record,
        model,
        dimensions,
    )


def get_cached_image_embeddings(
    database: Session,
    public_ids: list[str],
    model: str,
    dimensions: int,
) -> dict[str, ImageEmbedding]:
    statement = (
        select(
            Image.public_id,
            ImageEmbeddingRecord,
        )
        .join(
            ImageEmbeddingRecord,
            ImageEmbeddingRecord.image_id == Image.id,
        )
        .where(Image.public_id.in_(public_ids))
    )

    embeddings = {}

    for public_id, record in database.execute(statement):
        embedding = to_image_embedding(
            record,
            model,
            dimensions,
        )

        if embedding is not None:
            embeddings[public_id] = embedding

    return embeddings


def to_image_embedding(
    record: ImageEmbeddingRecord | None,
    model: str,
    dimensions: int,
) -> ImageEmbedding | None:
    if (
        record is None
        or record.model != model
        or record.dimensions != dimensions
        or len(record.embedding) != dimensions
    ):
        return None

    return ImageEmbedding(
        embedding=list(record.embedding),
        dimensions=record.dimensions,
        model=record.model,
    )


def persist_image_embedding(
    database: Session,
    image: Image,
    embedding: ImageEmbedding,
) -> ImageEmbedding:
    try:
        statement = (
            select(
                ImageEmbeddingRecord,
            )
            .where(
                ImageEmbeddingRecord.image_id
                == image.id,
            )
        )

        record = database.scalar(
            statement,
        )

        if record is None:
            record = (
                ImageEmbeddingRecord(
                    image_id=image.id,

                    embedding=list(
                        embedding.embedding,
                    ),

                    dimensions=(
                        embedding.dimensions
                    ),

                    model=(
                        embedding.model
                    ),
                )
            )

            database.add(
                record,
            )

        else:
            record.embedding = list(
                embedding.embedding,
            )

            record.dimensions = (
                embedding.dimensions
            )

            record.model = (
                embedding.model
            )

        database.commit()

        database.refresh(
            record,
        )

        return ImageEmbedding(
            embedding=list(
                record.embedding,
            ),

            dimensions=(
                record.dimensions
            ),

            model=record.model,
        )

    except Exception as error:
        database.rollback()

        raise EmbeddingStorageError(
            "Unable to save image embedding."
        ) from error