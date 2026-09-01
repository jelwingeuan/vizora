from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Request,
    UploadFile,
    status,
)

from sqlalchemy.orm import (
    Session,
)

from app.core.database import (
    get_db,
)

from app.models.image import (
    Image,
)

from app.schemas.analysis import (
    ImageAnalysis,
)

from app.schemas.image import (
    ImageFavoriteResponse,
    ImageFavoriteUpdate,
    ImageTitleResponse,
    ImageTitleUpdate,
    StoredImageResponse,
)

from app.services.analysis_store_service import (
    get_image_analyses,
)

from app.services.image_service import (
    ImageStorageError,
    ImageValidationError,
    MAX_IMAGE_SIZE,
    PendingImageUpload,
    SUPPORTED_IMAGE_TYPES,
    delete_stored_image,
    find_stored_image_by_public_id,
    list_stored_images,
    persist_uploaded_images,
    set_image_favorite,
    update_image_title,
)


router = APIRouter(
    prefix="/api/images",
    tags=["images"],
)


MAX_IMAGE_COUNT = 20


@router.get(
    "",
    response_model=list[
        StoredImageResponse
    ],
)
def get_images(
    request: Request,

    database: Session = Depends(
        get_db,
    ),
):
    images = (
        list_stored_images(
            database,
        )
    )

    analyses = (
        get_image_analyses(
            database,

            [
                image.id
                for image in images
            ],
        )
    )

    return [
        create_image_response(
            image=image,

            request=request,

            analysis=(
                analyses.get(
                    image.id,
                )
            ),
        )

        for image in images
    ]


@router.post(
    "",
    response_model=list[
        StoredImageResponse
    ],
    status_code=(
        status.HTTP_201_CREATED
    ),
)
def upload_images(
    request: Request,

    images: list[
        UploadFile
    ] = File(...),

    database: Session = Depends(
        get_db,
    ),
):
    if not images:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),

            detail=(
                "At least one image "
                "is required."
            ),
        )

    if (
        len(images)
        > MAX_IMAGE_COUNT
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),

            detail=(
                "A maximum of 20 images "
                "can be uploaded at once."
            ),
        )

    pending_uploads: list[
        PendingImageUpload
    ] = []

    for image in images:
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
            contents = (
                image.file.read(
                    MAX_IMAGE_SIZE
                    + 1,
                )
            )

        finally:
            image.file.close()

        if not contents:
            raise HTTPException(
                status_code=(
                    status.HTTP_400_BAD_REQUEST
                ),

                detail=(
                    "The uploaded image "
                    "is empty."
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

        pending_uploads.append(
            PendingImageUpload(
                original_filename=(
                    image.filename
                    or "image"
                ),

                mime_type=(
                    mime_type
                ),

                contents=(
                    contents
                ),
            )
        )

    try:
        stored_images = (
            persist_uploaded_images(
                database,
                pending_uploads,
            )
        )

    except ImageValidationError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
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

    return [
        create_image_response(
            image=image,

            request=request,

            analysis=None,
        )

        for image
        in stored_images
    ]


@router.patch(
    "/{image_id}",
    response_model=(
        ImageTitleResponse
    ),
)
def rename_image(
    image_id: str,

    payload:
        ImageTitleUpdate,

    database: Session = Depends(
        get_db,
    ),
):
    image = (
        find_stored_image_by_public_id(
            database,
            image_id,
        )
    )

    if image is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),

            detail=(
                "The stored image "
                "could not be found."
            ),
        )

    try:
        updated_image = (
            update_image_title(
                database=database,

                image=image,

                title=(
                    payload.title
                ),
            )
        )

    except ImageValidationError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
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

    return ImageTitleResponse(
        id=(
            updated_image.public_id
        ),

        title=(
            updated_image.title
        ),
    )


@router.delete(
    "/{image_id}",
    status_code=(
        status.HTTP_204_NO_CONTENT
    ),
)
def delete_image(
    image_id: str,

    database: Session = Depends(
        get_db,
    ),
) -> None:
    image = (
        find_stored_image_by_public_id(
            database,
            image_id,
        )
    )

    if image is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),

            detail=(
                "The stored image "
                "could not be found."
            ),
        )

    try:
        delete_stored_image(
            database=database,
            image=image,
        )

    except ImageStorageError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=str(error),
        ) from error


@router.patch(
    "/{image_id}/favorite",
    response_model=(
        ImageFavoriteResponse
    ),
)
def update_image_favorite(
    image_id: str,

    payload:
        ImageFavoriteUpdate,

    database: Session = Depends(
        get_db,
    ),
):
    image = (
        find_stored_image_by_public_id(
            database,
            image_id,
        )
    )

    if image is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),

            detail=(
                "The stored image "
                "could not be found."
            ),
        )

    try:
        updated_image = (
            set_image_favorite(
                database=database,

                image=image,

                is_favorite=(
                    payload.is_favorite
                ),
            )
        )

    except ImageStorageError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=str(error),
        ) from error

    return ImageFavoriteResponse(
        id=(
            updated_image.public_id
        ),

        is_favorite=(
            updated_image.is_favorite
        ),
    )


def create_image_response(
    image: Image,

    request: Request,

    analysis: (
        ImageAnalysis
        | None
    ),
) -> StoredImageResponse:
    image_url = str(
        request.url_for(
            "uploads",

            path=(
                image.stored_filename
            ),
        )
    )

    return StoredImageResponse(
        id=(
            image.public_id
        ),

        title=(
            image.title
        ),

        url=image_url,

        original_filename=(
            image.original_filename
        ),

        file_size=(
            image.file_size
        ),

        width=(
            image.width
        ),

        height=(
            image.height
        ),

        source=(
            image.source
        ),

        is_favorite=(
            image.is_favorite
        ),

        created_at=(
            image.created_at
        ),

        analysis=analysis,
    )