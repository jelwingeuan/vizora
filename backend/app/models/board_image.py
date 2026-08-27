from datetime import UTC, datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    UniqueConstraint,
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from app.core.database import Base


class BoardImage(Base):
    __tablename__ = "board_images"

    __table_args__ = (
        UniqueConstraint(
            "board_id",
            "image_id",
            name="uq_board_image",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    board_id: Mapped[int] = mapped_column(
        ForeignKey(
            "boards.id",
            ondelete="CASCADE",
        ),
        index=True,
        nullable=False,
    )

    image_id: Mapped[int] = mapped_column(
        ForeignKey(
            "images.id",
            ondelete="CASCADE",
        ),
        index=True,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(
            UTC,
        ),
        nullable=False,
    )