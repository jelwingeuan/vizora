import base64
import os

from dotenv import load_dotenv
from google import genai

from app.schemas.analysis import ImageAnalysis


load_dotenv()


DEFAULT_MODEL = "gemini-3.5-flash-lite"


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
- 5 to 10 useful searchable tags.
- A short creative note explaining how this reference could
  be useful in a visual project.

Do not identify real people.
Describe visual characteristics instead.
"""


class AIConfigurationError(RuntimeError):
    pass


class AIAnalysisError(RuntimeError):
    pass


def analyze_image_bytes(
    image_bytes: bytes,
    mime_type: str,
) -> ImageAnalysis:
    api_key = os.getenv(
        "GEMINI_API_KEY",
    )

    if not api_key:
        raise AIConfigurationError(
            "GEMINI_API_KEY is not configured."
        )

    model = os.getenv(
        "GEMINI_VISION_MODEL",
        DEFAULT_MODEL,
    )

    encoded_image = base64.b64encode(
        image_bytes,
    ).decode("utf-8")

    client = genai.Client(
        api_key=api_key,
    )

    try:
        interaction = client.interactions.create(
            model=model,
            input=[
                {
                    "type": "image",
                    "mime_type": mime_type,
                    "data": encoded_image,
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
        )

        if not interaction.output_text:
            raise AIAnalysisError(
                "Gemini returned an empty response."
            )

        return ImageAnalysis.model_validate_json(
            interaction.output_text,
        )

    except AIAnalysisError:
        raise

    except Exception as error:
        raise AIAnalysisError(
            "Gemini image analysis failed."
        ) from error

    finally:
        client.close()