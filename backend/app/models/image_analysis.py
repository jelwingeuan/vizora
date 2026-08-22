from datetime import UTC, datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    Text,
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from app.core.database import Base


class ImageAnalysisRecord(Base):
    __tablename__ = "image_analyses"

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

    summary: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    subject: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    style: Mapped[list[str]] = mapped_column(
        JSON,
        nullable=False,
    )

    mood: Mapped[list[str]] = mapped_column(
        JSON,
        nullable=False,
    )

    lighting: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    composition: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    color_palette: Mapped[
        list[str]
    ] = mapped_column(
        JSON,
        nullable=False,
    )

    tags: Mapped[list[str]] = mapped_column(
        JSON,
        nullable=False,
    )

    creative_notes: Mapped[str] = mapped_column(
        Text,
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