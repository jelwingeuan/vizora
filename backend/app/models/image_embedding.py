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


class ImageEmbeddingRecord(Base):
    __tablename__ = "image_embeddings"

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