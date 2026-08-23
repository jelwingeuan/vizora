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

from app.core.database import (
    get_db,
)

from app.schemas.embedding import (
    ImageEmbedding,
)

from app.services.embedding_service import (
    EMBEDDING_DIMENSIONS,
    EmbeddingConfigurationError,
    ImageEmbeddingError,
    generate_image_embedding,
    get_configured_embedding_model,
)

from app.services.embedding_store_service import (
    EmbeddingStorageError,
    find_image_by_public_id,
    get_stored_image_embedding,
    persist_image_embedding,
    read_stored_image_bytes,
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
async def create_temporary_image_embedding(
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
        return (
            await generate_image_embedding(
                image_bytes=contents,
                mime_type=mime_type,
            )
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


@router.post(
    "/image/{image_id}",
    response_model=ImageEmbedding,
)
async def get_or_create_stored_image_embedding(
    image_id: str,

    database: Session = Depends(
        get_db,
    ),
):
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

    model = (
        get_configured_embedding_model()
    )

    cached_embedding = (
        get_stored_image_embedding(
            database=database,

            image=stored_image,

            model=model,

            dimensions=(
                EMBEDDING_DIMENSIONS
            ),
        )
    )

    if cached_embedding is not None:
        return cached_embedding

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
        contents = (
            read_stored_image_bytes(
                stored_image,
            )
        )

    except EmbeddingStorageError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),

            detail=str(error),
        ) from error

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
        embedding = (
            await generate_image_embedding(
                image_bytes=contents,

                mime_type=(
                    stored_image.mime_type
                ),
            )
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

    try:
        return persist_image_embedding(
            database=database,

            image=stored_image,

            embedding=embedding,
        )

    except EmbeddingStorageError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),

            detail=str(error),
        ) from error