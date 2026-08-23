from pathlib import Path

from sqlalchemy import (
    select,
)

from sqlalchemy.orm import (
    Session,
)

from app.core.storage import (
    UPLOADS_DIR,
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


def find_image_by_public_id(
    database: Session,
    public_id: str,
) -> Image | None:
    statement = (
        select(Image)
        .where(
            Image.public_id
            == public_id,
        )
    )

    return database.scalar(
        statement,
    )


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

    if record is None:
        return None

    if (
        record.model
        != model
    ):
        return None

    if (
        record.dimensions
        != dimensions
    ):
        return None

    if (
        len(record.embedding)
        != dimensions
    ):
        return None

    return ImageEmbedding(
        embedding=list(
            record.embedding,
        ),
        dimensions=(
            record.dimensions
        ),
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


def read_stored_image_bytes(
    image: Image,
) -> bytes:
    image_path = (
        UPLOADS_DIR
        / image.stored_filename
    )

    try:
        contents = (
            image_path.read_bytes()
        )

    except OSError as error:
        raise EmbeddingStorageError(
            "Unable to read the stored image."
        ) from error

    if not contents:
        raise EmbeddingStorageError(
            "The stored image is empty."
        )

    return contents