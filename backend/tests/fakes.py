import math
import re
import zlib

from io import BytesIO

from PIL import (
    Image as PillowImage,
)

from app.schemas.analysis import (
    ImageAnalysis,
)

from app.services.visual_ai import (
    AIServiceError,
    TextTask,
)


FAKE_DIMENSIONS = 64


DEFAULT_ANALYSIS = ImageAnalysis(
    summary="A violet test swatch.",
    subject="color swatch",
    style=["flat"],
    mood=["calm"],
    lighting="even",
    composition="full frame",
    color_palette=["#7850c8"],
    tags=["violet", "swatch"],
    creative_notes="Useful as a color test.",
)


class FakeVisualAI:
    """
    Offline VisualAI adapter for tests.

    Text embeddings are hashed bags of words, so texts that share
    words are similar. Image embeddings are the image's mean RGB
    color, so images with close colors are similar.
    """

    text_embedding_model = "fake-text"

    image_embedding_model = "fake-image"

    embedding_dimensions = FAKE_DIMENSIONS

    def __init__(
        self,
    ) -> None:
        self.analysis = DEFAULT_ANALYSIS

        self.error: Exception | None = None

        self.failing_images: set[bytes] = set()

        self.embedded_texts: list[
            tuple[TextTask, str]
        ] = []

        self.embedded_image_count = 0

    def analyze_image(
        self,
        image_bytes: bytes,
        mime_type: str,
    ) -> ImageAnalysis:
        self._raise_if_failing()

        return self.analysis

    def embed_image(
        self,
        image_bytes: bytes,
        mime_type: str,
    ) -> list[float]:
        self._raise_if_failing()

        if image_bytes in self.failing_images:
            raise AIServiceError(
                "Fake image embedding failed."
            )

        self.embedded_image_count += 1

        with PillowImage.open(
            BytesIO(image_bytes),
        ) as image:
            red, green, blue = (
                image.convert("RGB")
                .resize((1, 1))
                .getpixel((0, 0))
            )

        return normalize(
            [red + 1, green + 1, blue + 1]
            + [0.0] * (FAKE_DIMENSIONS - 3)
        )

    def embed_texts(
        self,
        texts: list[str],
        task: TextTask,
    ) -> list[list[float]]:
        self._raise_if_failing()

        self.embedded_texts.extend(
            (task, text)
            for text in texts
        )

        vectors = []

        for text in texts:
            vector = [0.0] * FAKE_DIMENSIONS

            vector[0] = 0.01

            for word in re.findall(
                r"\w+",
                text.casefold(),
            ):
                vector[
                    zlib.crc32(word.encode())
                    % FAKE_DIMENSIONS
                ] += 1

            vectors.append(
                normalize(vector),
            )

        return vectors

    def _raise_if_failing(
        self,
    ) -> None:
        if self.error is not None:
            raise self.error


def normalize(
    values: list[float],
) -> list[float]:
    magnitude = math.sqrt(
        sum(
            value * value
            for value in values
        )
    )

    return [
        value / magnitude
        for value in values
    ]
