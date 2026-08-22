from sqlalchemy import (
    select,
)

from sqlalchemy.orm import (
    Session,
)

from app.models.image import (
    Image,
)

from app.models.image_analysis import (
    ImageAnalysisRecord,
)

from app.schemas.analysis import (
    ImageAnalysis,
)


class AnalysisStorageError(
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


def persist_image_analysis(
    database: Session,
    image: Image,
    analysis: ImageAnalysis,
) -> ImageAnalysis:
    try:
        statement = (
            select(
                ImageAnalysisRecord,
            )
            .where(
                ImageAnalysisRecord.image_id
                == image.id,
            )
        )

        record = database.scalar(
            statement,
        )

        if record is None:
            record = (
                ImageAnalysisRecord(
                    image_id=image.id,

                    summary=(
                        analysis.summary
                    ),

                    subject=(
                        analysis.subject
                    ),

                    style=list(
                        analysis.style,
                    ),

                    mood=list(
                        analysis.mood,
                    ),

                    lighting=(
                        analysis.lighting
                    ),

                    composition=(
                        analysis.composition
                    ),

                    color_palette=list(
                        analysis.color_palette,
                    ),

                    tags=list(
                        analysis.tags,
                    ),

                    creative_notes=(
                        analysis.creative_notes
                    ),
                )
            )

            database.add(
                record,
            )

        else:
            record.summary = (
                analysis.summary
            )

            record.subject = (
                analysis.subject
            )

            record.style = list(
                analysis.style,
            )

            record.mood = list(
                analysis.mood,
            )

            record.lighting = (
                analysis.lighting
            )

            record.composition = (
                analysis.composition
            )

            record.color_palette = list(
                analysis.color_palette,
            )

            record.tags = list(
                analysis.tags,
            )

            record.creative_notes = (
                analysis.creative_notes
            )

        database.commit()

        database.refresh(
            record,
        )

        return (
            create_analysis_schema(
                record,
            )
        )

    except Exception as error:
        database.rollback()

        raise AnalysisStorageError(
            "Unable to save image analysis."
        ) from error


def get_image_analyses(
    database: Session,
    image_ids: list[int],
) -> dict[
    int,
    ImageAnalysis,
]:
    if not image_ids:
        return {}

    statement = (
        select(
            ImageAnalysisRecord,
        )
        .where(
            ImageAnalysisRecord.image_id
            .in_(
                image_ids,
            )
        )
    )

    records = list(
        database.scalars(
            statement,
        ).all()
    )

    return {
        record.image_id:
            create_analysis_schema(
                record,
            )
        for record in records
    }


def create_analysis_schema(
    record: ImageAnalysisRecord,
) -> ImageAnalysis:
    return ImageAnalysis(
        summary=record.summary,

        subject=record.subject,

        style=list(
            record.style,
        ),

        mood=list(
            record.mood,
        ),

        lighting=record.lighting,

        composition=(
            record.composition
        ),

        color_palette=list(
            record.color_palette,
        ),

        tags=list(
            record.tags,
        ),

        creative_notes=(
            record.creative_notes
        ),
    )