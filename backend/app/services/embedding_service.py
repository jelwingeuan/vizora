import logging
import math
import os

from io import BytesIO

from dotenv import load_dotenv

from google import genai

from google.genai import (
    types,
)
from PIL import Image as PillowImage
from PIL import UnidentifiedImageError

from app.schemas.embedding import (
    ImageEmbedding,
)


load_dotenv()


logger = logging.getLogger(
    __name__,
)


DEFAULT_EMBEDDING_MODEL = (
    "gemini-embedding-2"
)

EMBEDDING_DIMENSIONS = 768

MAX_EMBEDDING_IMAGE_DIMENSION = 2048


class EmbeddingConfigurationError(
    RuntimeError,
):
    pass


class ImageEmbeddingError(
    RuntimeError,
):
    pass


def get_configured_embedding_model():
    return os.getenv(
        "GEMINI_IMAGE_EMBEDDING_MODEL",
        DEFAULT_EMBEDDING_MODEL,
    )


async def generate_image_embedding(
    image_bytes: bytes,
    mime_type: str,
) -> ImageEmbedding:
    api_key = os.getenv(
        "GEMINI_API_KEY",
    )

    if not api_key:
        raise EmbeddingConfigurationError(
            "GEMINI_API_KEY is not configured."
        )

    model = (
        get_configured_embedding_model()
    )

    client = None
    try:
        prepared_bytes, prepared_mime_type = (
            prepare_embedding_image(
                image_bytes,
                mime_type,
            )
        )

        client = genai.Client(
            api_key=api_key,
        )

        image_part = types.Part.from_bytes(
            data=prepared_bytes,
            mime_type=prepared_mime_type,
        )

        response = (
            await client.aio.models.embed_content(
                model=model,

                contents=[
                    image_part,
                ],

                config=(
                    types.EmbedContentConfig(
                        output_dimensionality=(
                            EMBEDDING_DIMENSIONS
                        ),
                    )
                ),
            )
        )

        if not response.embeddings:
            raise ImageEmbeddingError(
                "Gemini returned no "
                "image embedding."
            )

        embedding = (
            response.embeddings[0]
        )

        if not embedding.values:
            raise ImageEmbeddingError(
                "Gemini returned an empty "
                "image embedding."
            )

        normalized_embedding = (
            normalize_embedding(
                embedding.values,
            )
        )

        return ImageEmbedding(
            embedding=(
                normalized_embedding
            ),

            dimensions=len(
                normalized_embedding,
            ),

            model=model,
        )

    except ImageEmbeddingError:
        raise

    except Exception as error:
        logger.warning(
            "Image embedding generation failed.",
            exc_info=True,
        )

        raise ImageEmbeddingError(
            "Image embedding generation failed."
        ) from error

    finally:
        if client is not None:
            try:
                await client.aio.aclose()
            finally:
                client.close()


def prepare_embedding_image(
    image_bytes: bytes,
    mime_type: str,
) -> tuple[bytes, str]:
    if mime_type != "image/webp":
        return image_bytes, mime_type

    try:
        with PillowImage.open(
            BytesIO(image_bytes),
        ) as image:
            image.thumbnail(
                (
                    MAX_EMBEDDING_IMAGE_DIMENSION,
                    MAX_EMBEDDING_IMAGE_DIMENSION,
                ),
                PillowImage.Resampling.LANCZOS,
            )

            rgba_image = image.convert("RGBA")
            background = PillowImage.new(
                "RGBA",
                rgba_image.size,
                (255, 255, 255, 255),
            )
            background.alpha_composite(rgba_image)

            output = BytesIO()
            background.convert("RGB").save(
                output,
                format="JPEG",
                quality=85,
                optimize=True,
            )

            return output.getvalue(), "image/jpeg"

    except (
        UnidentifiedImageError,
        OSError,
        ValueError,
    ) as error:
        raise ImageEmbeddingError(
            "Unable to prepare WebP image for embedding."
        ) from error


def normalize_embedding(
    embedding: list[float],
) -> list[float]:
    if len(embedding) != EMBEDDING_DIMENSIONS:
        raise ImageEmbeddingError(
            "Image embedding has an unexpected dimension."
        )

    if not all(math.isfinite(value) for value in embedding):
        raise ImageEmbeddingError(
            "Image embedding contains non-finite values."
        )

    magnitude = math.hypot(*embedding)

    if not math.isfinite(magnitude) or magnitude == 0:
        raise ImageEmbeddingError(
            "Image embedding has zero magnitude."
        )

    return [
        value / magnitude
        for value in embedding
    ]