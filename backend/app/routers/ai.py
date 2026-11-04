from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from sqlalchemy.orm import (
    Session,
)

from app.core.database import (
    get_db,
)

from app.schemas.analysis import (
    ImageAnalysis,
)

from app.services.analysis_store_service import (
    AnalysisStorageError,
    persist_image_analysis,
)

from app.services.image_service import (
    ImageSizeError,
    ImageStorageError,
    MAX_IMAGE_SIZE,
    SUPPORTED_IMAGE_TYPES,
    find_stored_image_by_public_id,
    read_stored_image_bytes,
)

from app.services.visual_ai import (
    AIConfigurationError,
    AIImageSizeError,
    AIServiceError,
    INLINE_IMAGE_TOO_LARGE_DETAIL,
    MAX_INLINE_IMAGE_SIZE,
    VisualAI,
    get_visual_ai,
)


router = APIRouter(
    prefix="/api/ai",
    tags=["ai"],
)


@router.post(
    "/analyze/{image_id}",
    response_model=ImageAnalysis,
)
def analyze_stored_image(
    image_id: str,

    database: Session = Depends(
        get_db,
    ),

    ai: VisualAI = Depends(
        get_visual_ai,
    ),
):
    stored_image = (
        find_stored_image_by_public_id(
            database,
            image_id,
        )
    )

    if stored_image is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),

            detail=(
                "The stored image "
                "could not be found."
            ),
        )

    if (
        stored_image.mime_type
        not in SUPPORTED_IMAGE_TYPES
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_415_UNSUPPORTED_MEDIA_TYPE
            ),

            detail=(
                "The stored image type "
                "is not supported."
            ),
        )

    if stored_image.file_size > MAX_INLINE_IMAGE_SIZE:
        raise HTTPException(
            status_code=(
                status.HTTP_413_CONTENT_TOO_LARGE
            ),
            detail=INLINE_IMAGE_TOO_LARGE_DETAIL,
        )

    try:
        contents = read_stored_image_bytes(
            stored_image,
            MAX_IMAGE_SIZE,
        )

    except ImageSizeError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_413_CONTENT_TOO_LARGE
            ),
            detail=str(error),
        ) from error

    except ImageStorageError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=str(error),
        ) from error

    try:
        analysis = ai.analyze_image(
            image_bytes=contents,
            mime_type=(
                stored_image.mime_type
            ),
        )

    except AIConfigurationError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_503_SERVICE_UNAVAILABLE
            ),
            detail=str(error),
        ) from error

    except AIImageSizeError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_413_CONTENT_TOO_LARGE
            ),
            detail=str(error),
        ) from error

    except AIServiceError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_502_BAD_GATEWAY
            ),
            detail=str(error),
        ) from error

    try:
        return persist_image_analysis(
            database,
            stored_image,
            analysis,
        )

    except AnalysisStorageError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=str(error),
        ) from error
