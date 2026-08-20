from fastapi import (
    APIRouter,
    File,
    HTTPException,
    UploadFile,
    status,
)

from app.schemas.embedding import (
    ImageEmbedding,
)

from app.services.embedding_service import (
    EmbeddingConfigurationError,
    ImageEmbeddingError,
    generate_image_embedding,
)


router = APIRouter(
    prefix="/api/embeddings",
    tags=["embeddings"],
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
    "/image",
    response_model=ImageEmbedding,
)
async def create_image_embedding(
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
        return await generate_image_embedding(
            image_bytes=contents,
            mime_type=mime_type,
        )

    except EmbeddingConfigurationError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_503_SERVICE_UNAVAILABLE
            ),
            detail=str(error),
        ) from error

    except ImageEmbeddingError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_502_BAD_GATEWAY
            ),
            detail=str(error),
        ) from error