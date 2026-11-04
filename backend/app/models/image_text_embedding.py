from datetime import UTC, datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from app.core.database import Base


class ImageTextEmbeddingRecord(Base):
    __tablename__ = "image_text_embeddings"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    image_id: Mapped[int] = mapped_column(
        ForeignKey(
            "images.id",
            ondelete="CASCADE",
        ),
        unique=True,
        index=True,
        nullable=False,
    )

    embedding: Mapped[
        list[float]
    ] = mapped_column(
        JSON,
        nullable=False,
    )

    dimensions: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    model: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    # SHA-256 of the search document the embedding was made from.
    document_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )

    created_at: Mapped[
        datetime
    ] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(
            UTC,
        ),
        nullable=False,
    )

    updated_at: Mapped[
        datetime
    ] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(
            UTC,
        ),
        onupdate=lambda: datetime.now(
            UTC,
        ),
        nullable=False,
    )
