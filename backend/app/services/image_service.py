from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from uuid import uuid4

from PIL import (
    Image as PillowImage,
    UnidentifiedImageError,
)

from sqlalchemy import (
    select,
)

from sqlalchemy.orm import (
    Session,
)

from app.core.storage import (
    UPLOADS_DIR,
)

from app.models.image import (
    Image,
)


MAX_IMAGE_SIZE = (
    15 * 1024 * 1024
)


SUPPORTED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}


FORMAT_TO_MIME_TYPE = {
    "JPEG": "image/jpeg",
    "PNG": "image/png",
    "WEBP": "image/webp",
}


MIME_TYPE_TO_EXTENSION = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


class ImageValidationError(
    RuntimeError,
):
    pass


class ImageStorageError(
    RuntimeError,
):
    pass


class ImageSizeError(
    RuntimeError,
):
    pass


@dataclass(
    frozen=True,
    slots=True,
)
class PendingImageUpload:
    original_filename: str

    mime_type: str

    contents: bytes


def list_stored_images(
    database: Session,
) -> list[Image]:
    statement = (
        select(Image)
        .order_by(
            Image.created_at.desc(),
            Image.id.desc(),
        )
    )

    return list(
        database.scalars(
            statement,
        ).all()
    )


def find_stored_image_by_public_id(
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


def update_image_title(
    database: Session,
    image: Image,
    title: str,
) -> Image:
    normalized_title = (
        title.strip()
    )

    if not normalized_title:
        raise ImageValidationError(
            "Image title cannot be empty."
        )

    if (
        len(normalized_title)
        > 255
    ):
        raise ImageValidationError(
            "Image title must be 255 "
            "characters or fewer."
        )

    try:
        image.title = (
            normalized_title
        )

        database.commit()

        database.refresh(
            image,
        )

        return image

    except Exception as error:
        database.rollback()

        raise ImageStorageError(
            "Unable to rename the image."
        ) from error


def set_image_favorite(
    database: Session,
    image: Image,
    is_favorite: bool,
) -> Image:
    try:
        image.is_favorite = (
            is_favorite
        )

        database.commit()

        database.refresh(
            image,
        )

        return image

    except Exception as error:
        database.rollback()

        raise ImageStorageError(
            "Unable to update favorite state."
        ) from error


def delete_stored_image(
    database: Session,
    image: Image,
) -> None:
    image_path = (
        UPLOADS_DIR
        / image.stored_filename
    )

    quarantine_path = (
        UPLOADS_DIR
        / (
            f".delete-{uuid4()}-"
            f"{image.stored_filename}"
        )
    )

    file_was_moved = (
        False
    )

    try:
        if image_path.exists():
            image_path.replace(
                quarantine_path,
            )

            file_was_moved = (
                True
            )

        database.delete(
            image,
        )

        database.commit()

    except Exception as error:
        database.rollback()

        if file_was_moved:
            try:
                quarantine_path.replace(
                    image_path,
                )

            except OSError as restore_error:
                raise ImageStorageError(
                    "Unable to delete the image "
                    "and restore its stored file."
                ) from restore_error

        raise ImageStorageError(
            "Unable to delete the stored image."
        ) from error

    if file_was_moved:
        cleanup_saved_files(
            [
                quarantine_path,
            ],
        )


def read_stored_image_bytes(
    image: Image,
    max_size: int = MAX_IMAGE_SIZE,
) -> bytes:
    image_path = (
        UPLOADS_DIR
        / image.stored_filename
    )

    try:
        with image_path.open(
            "rb",
        ) as file:
            contents = file.read(
                max_size + 1,
            )

    except OSError as error:
        raise ImageStorageError(
            "Unable to read the stored image."
        ) from error

    if not contents:
        raise ImageStorageError(
            "The stored image is empty."
        )

    if (
        len(contents)
        > max_size
    ):
        raise ImageSizeError(
            "Images must be smaller "
            "than 15 MB."
        )

    return contents


def persist_uploaded_images(
    database: Session,
    uploads: list[
        PendingImageUpload
    ],
) -> list[Image]:
    records: list[
        Image
    ] = []

    saved_paths: list[
        Path
    ] = []

    try:
        for upload in uploads:
            (
                width,
                height,
                detected_mime_type,
            ) = inspect_image(
                upload.contents,
            )

            if (
                detected_mime_type
                != upload.mime_type
            ):
                raise ImageValidationError(
                    "The uploaded file type "
                    "does not match its image data."
                )

            stored_filename = (
                create_stored_filename(
                    detected_mime_type,
                )
            )

            destination = (
                UPLOADS_DIR
                / stored_filename
            )

            destination.write_bytes(
                upload.contents,
            )

            saved_paths.append(
                destination,
            )

            original_filename = (
                normalize_filename(
                    upload.original_filename,
                )
            )

            record = Image(
                title=create_title(
                    original_filename,
                ),

                original_filename=(
                    original_filename
                ),

                stored_filename=(
                    stored_filename
                ),

                storage_path=(
                    Path(
                        "storage",
                        "uploads",
                        stored_filename,
                    ).as_posix()
                ),

                mime_type=(
                    detected_mime_type
                ),

                file_size=len(
                    upload.contents,
                ),

                width=width,

                height=height,

                source="upload",
            )

            records.append(
                record,
            )

        database.add_all(
            records,
        )

        database.commit()

        for record in records:
            database.refresh(
                record,
            )

        return records

    except ImageValidationError:
        database.rollback()

        cleanup_saved_files(
            saved_paths,
        )

        raise

    except Exception as error:
        database.rollback()

        cleanup_saved_files(
            saved_paths,
        )

        raise ImageStorageError(
            "Unable to persist uploaded images."
        ) from error


def inspect_image(
    contents: bytes,
) -> tuple[
    int,
    int,
    str,
]:
    try:
        with PillowImage.open(
            BytesIO(contents),
        ) as image:
            width, height = (
                image.size
            )

            image_format = (
                image.format
                or ""
            ).upper()

            image.verify()

    except (
        UnidentifiedImageError,
        OSError,
        ValueError,
    ) as error:
        raise ImageValidationError(
            "The uploaded file is not "
            "a valid image."
        ) from error

    detected_mime_type = (
        FORMAT_TO_MIME_TYPE.get(
            image_format,
        )
    )

    if not detected_mime_type:
        raise ImageValidationError(
            "Only JPG, PNG, and WebP "
            "images are supported."
        )

    if (
        width <= 0
        or height <= 0
    ):
        raise ImageValidationError(
            "The image has invalid dimensions."
        )

    return (
        width,
        height,
        detected_mime_type,
    )


def create_stored_filename(
    mime_type: str,
) -> str:
    extension = (
        MIME_TYPE_TO_EXTENSION.get(
            mime_type,
        )
    )

    if not extension:
        raise ImageValidationError(
            "Unsupported image type."
        )

    return (
        f"{uuid4()}{extension}"
    )


def normalize_filename(
    filename: str,
) -> str:
    cleaned_filename = (
        Path(filename)
        .name
        .strip()
    )

    if not cleaned_filename:
        return "image"

    return cleaned_filename[
        :255
    ]


def create_title(
    filename: str,
) -> str:
    title = (
        Path(filename)
        .stem
        .strip()
    )

    if not title:
        return (
            "Untitled reference"
        )

    return title[
        :255
    ]


def cleanup_saved_files(
    paths: list[Path],
) -> None:
    for path in paths:
        try:
            path.unlink(
                missing_ok=True,
            )

        except OSError:
            pass