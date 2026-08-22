from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)

from sqlalchemy.orm import (
    Session,
)

from starlette.concurrency import (
    run_in_threadpool,
)

from app.core.database import (
    get_db,
)

from app.schemas.analysis import (
    ImageAnalysis,
)

from app.services.ai_service import (
    AIAnalysisError,
    AIConfigurationError,
    analyze_image_bytes,
)

from app.services.analysis_store_service import (
    AnalysisStorageError,
    find_image_by_public_id,
    persist_image_analysis,
)


router = APIRouter(
    prefix="/api/ai",
    tags=["ai"],
)


SUPPORTED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}


MAX_IMAGE_SIZE = (
    15 * 1024 * 1024
)


@router.post(
    "/analyze",
    response_model=ImageAnalysis,
)
async def analyze_image(
    image: UploadFile = File(...),

    image_id: str | None = Form(
        default=None,
    ),

    database: Session = Depends(
        get_db,
    ),
):
    mime_type = (
        image.content_type
        or ""
    )

    if (
        mime_type
        not in SUPPORTED_IMAGE_TYPES
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_415_UNSUPPORTED_MEDIA_TYPE
            ),
            detail=(
                "Only JPG, PNG, and WebP "
                "images are supported."
            ),
        )

    stored_image = None

    if image_id:
        stored_image = (
            find_image_by_public_id(
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

    contents = await image.read()

    if not contents:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=(
                "The uploaded image is empty."
            ),
        )

    if (
        len(contents)
        > MAX_IMAGE_SIZE
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_413_CONTENT_TOO_LARGE
            ),
            detail=(
                "Images must be smaller "
                "than 15 MB."
            ),
        )

    try:
        analysis = (
            await run_in_threadpool(
                analyze_image_bytes,
                image_bytes=contents,
                mime_type=mime_type,
            )
        )

    except AIConfigurationError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_503_SERVICE_UNAVAILABLE
            ),
            detail=str(error),
        ) from error

    except AIAnalysisError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_502_BAD_GATEWAY
            ),
            detail=str(error),
        ) from error

    if stored_image is None:
        return analysis

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