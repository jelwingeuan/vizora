import asyncio
import base64
import logging
import math
import os

from collections.abc import (
    Callable,
)

from functools import (
    lru_cache,
)

from io import (
    BytesIO,
)

from typing import (
    Literal,
    Protocol,
    TypeVar,
)

from dotenv import (
    load_dotenv,
)

from google import genai

from google.genai import (
    types,
)

from PIL import (
    Image as PillowImage,
    UnidentifiedImageError,
)

from app.schemas.analysis import (
    ImageAnalysis,
)


load_dotenv()


logger = logging.getLogger(
    __name__,
)


DEFAULT_VISION_MODEL = (
    "gemini-3.5-flash-lite"
)

DEFAULT_TEXT_EMBEDDING_MODEL = (
    "gemini-embedding-001"
)

DEFAULT_IMAGE_EMBEDDING_MODEL = (
    "gemini-embedding-2"
)

EMBEDDING_DIMENSIONS = 768

TEXT_EMBEDDING_BATCH_SIZE = 24

MAX_EMBEDDING_IMAGE_DIMENSION = 2048

MAX_INLINE_IMAGE_SIZE = 14 * 1024 * 1024

INLINE_IMAGE_TOO_LARGE_DETAIL = (
    "AI analysis images must be no larger than 14 MiB."
)


TextTask = Literal[
    "query",
    "document",
]


TEXT_TASK_TYPES: dict[
    TextTask,
    str,
] = {
    "query": "RETRIEVAL_QUERY",
    "document": "RETRIEVAL_DOCUMENT",
}


ANALYSIS_PROMPT = """
You are VIZORA Intelligence, a visual-reference analysis engine
for designers, artists, filmmakers, photographers, animators,
game developers, and other creative professionals.

Analyze the supplied image as a creative visual reference.

Focus only on visible creative qualities.

Provide:
- A concise visual summary.
- The primary subject.
- 2 to 5 useful style descriptors.
- 2 to 5 mood descriptors.
- A concise lighting description.
- A concise composition description.
- 4 to 6 representative hexadecimal color values.
- 6 to 10 concise searchable tags.

Tag rules:
- Use lowercase.
- Prefer 1 to 3 words per tag.
- Do not use hashtags.
- Do not repeat tags.
- Prefer visually useful concepts such as subject, style,
  mood, lighting, environment, material, composition,
  color, era, and medium when they are clearly visible.

- A short creative note explaining how this reference could
  be useful in a visual project.

Do not identify real people.
Describe visual characteristics instead.
"""


class AIConfigurationError(
    RuntimeError,
):
    """The AI provider is not configured (HTTP 503)."""


class AIServiceError(
    RuntimeError,
):
    """The AI provider failed or returned unusable output (HTTP 502)."""


class AIImageSizeError(
    RuntimeError,
):
    """The image is too large to send to the provider (HTTP 413)."""


class VisualAI(
    Protocol,
):
    """
    Everything VIZORA asks of an AI provider.

    Embeddings are unit length, so a dot product is their cosine
    similarity. A stored vector is only comparable with a new one
    when its model and dimensions match the attributes below.
    """

    text_embedding_model: str

    image_embedding_model: str

    embedding_dimensions: int

    def analyze_image(
        self,
        image_bytes: bytes,
        mime_type: str,
    ) -> ImageAnalysis: ...

    def embed_image(
        self,
        image_bytes: bytes,
        mime_type: str,
    ) -> list[float]: ...

    def embed_texts(
        self,
        texts: list[str],
        task: TextTask,
    ) -> list[list[float]]: ...


ResultT = TypeVar(
    "ResultT",
)


class GeminiVisualAI:
    def __init__(
        self,
    ) -> None:
        self.vision_model = os.getenv(
            "GEMINI_VISION_MODEL",
            DEFAULT_VISION_MODEL,
        )

        self.text_embedding_model = os.getenv(
            "GEMINI_EMBEDDING_MODEL",
            DEFAULT_TEXT_EMBEDDING_MODEL,
        )

        self.image_embedding_model = os.getenv(
            "GEMINI_IMAGE_EMBEDDING_MODEL",
            DEFAULT_IMAGE_EMBEDDING_MODEL,
        )

        self.embedding_dimensions = (
            EMBEDDING_DIMENSIONS
        )

    def analyze_image(
        self,
        image_bytes: bytes,
        mime_type: str,
    ) -> ImageAnalysis:
        if len(image_bytes) > MAX_INLINE_IMAGE_SIZE:
            raise AIImageSizeError(
                INLINE_IMAGE_TOO_LARGE_DETAIL
            )

        def run(
            client: genai.Client,
        ) -> ImageAnalysis:
            interaction = client.interactions.create(
                model=(
                    self.vision_model
                ),

                input=[
                    {
                        "type": "image",
                        "mime_type": mime_type,
                        "data": base64.b64encode(
                            image_bytes,
                        ).decode("utf-8"),
                    },
                    {
                        "type": "text",
                        "text": ANALYSIS_PROMPT,
                    },
                ],

                response_format={
                    "type": "text",
                    "mime_type": "application/json",
                    "schema": (
                        ImageAnalysis
                        .model_json_schema()
                    ),
                },

                store=False,
            )

            if not interaction.output_text:
                raise AIServiceError(
                    "Gemini returned an empty response."
                )

            return ImageAnalysis.model_validate_json(
                interaction.output_text,
            )

        return self._call(
            "image analysis",
            run,
        )

    def embed_image(
        self,
        image_bytes: bytes,
        mime_type: str,
    ) -> list[float]:
        prepared_bytes, prepared_mime_type = (
            prepare_embedding_image(
                image_bytes,
                mime_type,
            )
        )

        def run(
            client: genai.Client,
        ) -> list[float]:
            response = (
                client.models.embed_content(
                    model=(
                        self.image_embedding_model
                    ),

                    contents=[
                        types.Part.from_bytes(
                            data=prepared_bytes,
                            mime_type=prepared_mime_type,
                        ),
                    ],

                    config=(
                        types.EmbedContentConfig(
                            output_dimensionality=(
                                self.embedding_dimensions
                            ),
                        )
                    ),
                )
            )

            if not response.embeddings:
                raise AIServiceError(
                    "Gemini returned no "
                    "image embedding."
                )

            return normalize_vector(
                response.embeddings[0].values
                or [],
            )

        return self._call(
            "image embedding",
            run,
        )

    def embed_texts(
        self,
        texts: list[str],
        task: TextTask,
    ) -> list[list[float]]:
        if not texts:
            return []

        if (
            self.text_embedding_model
            .removeprefix("models/")
            != DEFAULT_TEXT_EMBEDDING_MODEL
        ):
            raise AIConfigurationError(
                "GEMINI_EMBEDDING_MODEL must use "
                f"{DEFAULT_TEXT_EMBEDDING_MODEL}."
            )

        def run(
            client: genai.Client,
        ) -> list[list[float]]:
            vectors: list[
                list[float]
            ] = []

            for start_index in range(
                0,
                len(texts),
                TEXT_EMBEDDING_BATCH_SIZE,
            ):
                batch = texts[
                    start_index:
                    start_index
                    + TEXT_EMBEDDING_BATCH_SIZE
                ]

                response = (
                    client.models.embed_content(
                        model=(
                            self.text_embedding_model
                        ),

                        contents=batch,

                        config=(
                            types.EmbedContentConfig(
                                task_type=(
                                    TEXT_TASK_TYPES[
                                        task
                                    ]
                                ),

                                output_dimensionality=(
                                    self.embedding_dimensions
                                ),
                            )
                        ),
                    )
                )

                if (
                    len(response.embeddings or [])
                    != len(batch)
                ):
                    raise AIServiceError(
                        "Gemini returned an unexpected "
                        "number of text embeddings."
                    )

                vectors.extend(
                    normalize_vector(
                        embedding.values
                        or [],
                    )
                    for embedding
                    in response.embeddings
                )

            return vectors

        return self._call(
            "text embedding",
            run,
        )

    def _call(
        self,
        action: str,
        run: Callable[
            [genai.Client],
            ResultT,
        ],
    ) -> ResultT:
        api_key = os.getenv(
            "GEMINI_API_KEY",
        )

        if not api_key:
            raise AIConfigurationError(
                "GEMINI_API_KEY is not configured."
            )

        client = genai.Client(
            api_key=api_key,
        )

        try:
            return run(
                client,
            )

        except AIServiceError:
            raise

        except Exception as error:
            logger.warning(
                "Gemini %s failed.",
                action,
                exc_info=True,
            )

            raise AIServiceError(
                f"Gemini {action} failed."
            ) from error

        finally:
            try:
                client.close()

            finally:
                asyncio.run(
                    client.aio.aclose(),
                )


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
        raise AIServiceError(
            "Unable to prepare WebP image for embedding."
        ) from error


def normalize_vector(
    values: list[float],
) -> list[float]:
    if len(values) != EMBEDDING_DIMENSIONS:
        raise AIServiceError(
            "Gemini returned an embedding "
            "with an unexpected dimension."
        )

    if not all(
        math.isfinite(value)
        for value in values
    ):
        raise AIServiceError(
            "Gemini returned an embedding "
            "with non-finite values."
        )

    magnitude = math.hypot(*values)

    if (
        not math.isfinite(magnitude)
        or magnitude == 0
    ):
        raise AIServiceError(
            "Gemini returned an empty embedding."
        )

    return [
        value / magnitude
        for value in values
    ]


@lru_cache
def get_visual_ai() -> VisualAI:
    return GeminiVisualAI()
