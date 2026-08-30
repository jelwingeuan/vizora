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
    get_stored_image_embedding,
    persist_image_embedding,
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
    prefix="/api/embeddings",
    tags=["embeddings"],
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

    try:
        return (
            await generate_image_embedding(
                image_bytes=contents,

                mime_type=(
                    detected_mime_type
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

    if (
        cached_embedding
        is not None
    ):
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