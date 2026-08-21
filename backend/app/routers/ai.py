from fastapi import (
    APIRouter,
    File,
    HTTPException,
    UploadFile,
    status,
)

from starlette.concurrency import (
    run_in_threadpool,
)

from app.schemas.analysis import (
    ImageAnalysis,
)

from app.services.ai_service import (
    AIAnalysisError,
    AIConfigurationError,
    analyze_image_bytes,
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
):
    mime_type = (
        image.content_type or ""
    )

    if mime_type not in SUPPORTED_IMAGE_TYPES:
        raise HTTPException(
            status_code=(
                status.HTTP_415_UNSUPPORTED_MEDIA_TYPE
            ),
            detail=(
                "Only JPG, PNG, and WebP "
                "images are supported."
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

    if len(contents) > MAX_IMAGE_SIZE:
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
        return await run_in_threadpool(
            analyze_image_bytes,
            image_bytes=contents,
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