from fastapi import (
    APIRouter,
    Depends,
    File,
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
    persist_image_analysis,
)

from app.services.image_service import (
    ImageSizeError,
    ImageStorageError,
    ImageValidationError,
    MAX_IMAGE_SIZE,
    SUPPORTED_IMAGE_TYPES,
    find_stored_image_by_public_id,
    inspect_image,
    read_stored_image_bytes,
)


router = APIRouter(
    prefix="/api/ai",
    tags=["ai"],
)


@router.post(
    "/analyze",
    response_model=ImageAnalysis,
)
async def analyze_temporary_image(
    image: UploadFile = File(...),
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

    try:
        contents = await image.read(
            MAX_IMAGE_SIZE + 1,
        )

    finally:
        await image.close()

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
        (
            _,
            _,
            detected_mime_type,
        ) = await run_in_threadpool(
            inspect_image,
            contents,
        )

    except ImageValidationError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(error),
        ) from error

    if (
        detected_mime_type
        != mime_type
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),

            detail=(
                "The uploaded file type "
                "does not match its image data."
            ),
        )

    return await run_analysis(
        image_bytes=contents,
        mime_type=detected_mime_type,
    )


@router.post(
    "/analyze/{image_id}",
    response_model=ImageAnalysis,
)
async def analyze_stored_image(
    image_id: str,

    database: Session = Depends(
        get_db,
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

    try:
        contents = await run_in_threadpool(
            read_stored_image_bytes,
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

    analysis = await run_analysis(
        image_bytes=contents,
        mime_type=(
            stored_image.mime_type
        ),
    )

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


async def run_analysis(
    image_bytes: bytes,
    mime_type: str,
) -> ImageAnalysis:
    try:
        return await run_in_threadpool(
            analyze_image_bytes,
            image_bytes=image_bytes,
            mime_type=mime_type,
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