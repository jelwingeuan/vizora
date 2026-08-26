from datetime import datetime

from pydantic import (
    BaseModel,
    Field,
    field_validator,
)


class BoardCreate(
    BaseModel,
):
    name: str = Field(
        min_length=1,
        max_length=100,
    )

    description: (
        str
        | None
    ) = Field(
        default=None,
        max_length=500,
    )

    @field_validator(
        "name",
    )
    @classmethod
    def normalize_name(
        cls,
        value: str,
    ) -> str:
        normalized = (
            " ".join(
                value
                .strip()
                .split()
            )
        )

        if not normalized:
            raise ValueError(
                "Board name cannot be empty."
            )

        return normalized

    @field_validator(
        "description",
    )
    @classmethod
    def normalize_description(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        normalized = (
            " ".join(
                value
                .strip()
                .split()
            )
        )

        if not normalized:
            return None

        return normalized


class BoardResponse(
    BaseModel,
):
    id: str

    name: str

    description: (
        str
        | None
    )

    created_at: datetime

    updated_at: datetime