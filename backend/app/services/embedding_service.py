import math
import os

from dotenv import load_dotenv

from google import genai

from google.genai import (
    types,
)

from app.schemas.embedding import (
    ImageEmbedding,
)


load_dotenv()


DEFAULT_EMBEDDING_MODEL = (
    "gemini-embedding-2"
)

EMBEDDING_DIMENSIONS = 768


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

    client = genai.Client(
        api_key=api_key,
    )

    image_part = (
        types.Part.from_bytes(
            data=image_bytes,
            mime_type=mime_type,
        )
    )

    try:
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
        raise ImageEmbeddingError(
            "Image embedding generation failed: "
            f"{type(error).__name__}: "
            f"{error}"
        ) from error

    finally:
        await client.aio.aclose()


def normalize_embedding(
    embedding: list[float],
) -> list[float]:
    magnitude = math.sqrt(
        sum(
            value * value
            for value in embedding
        )
    )

    if magnitude == 0:
        raise ImageEmbeddingError(
            "Image embedding has zero magnitude."
        )

    return [
        value / magnitude
        for value in embedding
    ]