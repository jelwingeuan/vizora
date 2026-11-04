import base64
import json

from io import BytesIO
from types import SimpleNamespace

import httpx
import pytest

from PIL import Image as PillowImage

from app.schemas.analysis import ImageAnalysis
from app.services import visual_ai
from app.services.visual_ai import (
    AIConfigurationError,
    AIImageSizeError,
    AIServiceError,
    GeminiVisualAI,
)


ANALYSIS = ImageAnalysis(
    summary="A colorful reference.",
    subject="abstract shapes",
    style=["geometric"],
    mood=["bright"],
    lighting="soft",
    composition="centered",
    color_palette=["#ff0000"],
    tags=["abstract", "colorful"],
    creative_notes="Useful for a title card.",
)


def create_fake_client(
    values: list[float],
    calls: dict,
):
    class FakeModels:
        def embed_content(self, **kwargs):
            calls["request"] = kwargs

            return SimpleNamespace(
                embeddings=[
                    SimpleNamespace(values=values),
                ],
            )

    class FakeAio:
        async def aclose(self):
            calls["async_closed"] = True

    class FakeClient:
        models = FakeModels()
        aio = FakeAio()

        def close(self):
            calls["sync_closed"] = True

    return FakeClient()


@pytest.fixture(autouse=True)
def gemini_environment(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.delenv("GEMINI_EMBEDDING_MODEL", raising=False)
    monkeypatch.delenv("GEMINI_IMAGE_EMBEDDING_MODEL", raising=False)


def test_webp_embedding_is_sent_as_jpeg_and_closes_clients(
    monkeypatch,
):
    image_buffer = BytesIO()

    PillowImage.new(
        "RGBA",
        (8, 6),
        (255, 0, 0, 128),
    ).save(
        image_buffer,
        format="WEBP",
        lossless=True,
    )

    calls = {}

    monkeypatch.setattr(
        visual_ai.genai,
        "Client",
        lambda api_key: create_fake_client(
            [1.0] + [0.0] * 767,
            calls,
        ),
    )

    vector = GeminiVisualAI().embed_image(
        image_buffer.getvalue(),
        "image/webp",
    )

    assert len(vector) == 768
    assert calls["sync_closed"] is True
    assert calls["async_closed"] is True

    image_part = calls["request"]["contents"][0]

    assert image_part.inline_data.mime_type == "image/jpeg"

    with PillowImage.open(
        BytesIO(image_part.inline_data.data),
    ) as converted_image:
        assert converted_image.format == "JPEG"
        assert converted_image.size == (8, 6)

        red, green, blue = converted_image.getpixel((0, 0))

        assert red > green > 100
        assert red > blue > 100


@pytest.mark.parametrize(
    "values",
    [
        [1.0, 0.0],
        [float("nan")] + [0.0] * 767,
        [float("inf")] + [0.0] * 767,
        [0.0] * 768,
    ],
    ids=["wrong-size", "nan", "infinity", "zero"],
)
def test_invalid_embedding_is_rejected_and_clients_close(
    values,
    monkeypatch,
):
    calls = {}

    monkeypatch.setattr(
        visual_ai.genai,
        "Client",
        lambda api_key: create_fake_client(values, calls),
    )

    with pytest.raises(AIServiceError):
        GeminiVisualAI().embed_image(
            b"image",
            "image/png",
        )

    assert calls["sync_closed"] is True
    assert calls["async_closed"] is True


def test_inline_budget_fits_the_provider_request_limit():
    encoded_size = 4 * (
        (visual_ai.MAX_INLINE_IMAGE_SIZE + 2) // 3
    )

    overhead = len(
        json.dumps(
            ImageAnalysis.model_json_schema()
        ).encode()
    ) + len(visual_ai.ANALYSIS_PROMPT.encode()) + 1024

    assert encoded_size + overhead < 20_000_000


def test_oversized_analysis_is_rejected_before_client_creation(
    monkeypatch,
):
    def fail_if_client_created(api_key):
        raise AssertionError("Provider client should not be created")

    monkeypatch.setattr(
        visual_ai.genai,
        "Client",
        fail_if_client_created,
    )

    with pytest.raises(AIImageSizeError):
        GeminiVisualAI().analyze_image(
            b"x" * (visual_ai.MAX_INLINE_IMAGE_SIZE + 1),
            "image/png",
        )


def test_provider_error_details_are_not_exposed(monkeypatch):
    class FailingModels:
        def embed_content(self, **kwargs):
            raise ValueError("secret provider detail")

    client = create_fake_client([], {})
    client.models = FailingModels()

    monkeypatch.setattr(
        visual_ai.genai,
        "Client",
        lambda api_key: client,
    )

    with pytest.raises(AIServiceError) as error:
        GeminiVisualAI().embed_texts(["blue"], "query")

    assert "secret" not in str(error.value)
    assert "ValueError" not in str(error.value)


def test_incompatible_text_embedding_model_is_rejected(monkeypatch):
    monkeypatch.setenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-2")

    with pytest.raises(AIConfigurationError) as error:
        GeminiVisualAI().embed_texts(["blue"], "query")

    assert "gemini-embedding-001" in str(error.value)


def test_supported_sdk_serializes_and_parses_analysis(monkeypatch):
    requests = []

    def respond_without_network(self, request, *args, **kwargs):
        requests.append(request)

        return httpx.Response(
            200,
            json={
                "status": "completed",
                "id": "test-interaction",
                "steps": [
                    {
                        "type": "model_output",
                        "content": [
                            {
                                "type": "text",
                                "text": ANALYSIS.model_dump_json(),
                            },
                        ],
                    },
                ],
            },
            request=request,
        )

    monkeypatch.setattr(
        httpx.Client,
        "send",
        respond_without_network,
    )

    result = GeminiVisualAI().analyze_image(
        b"image-data",
        "image/png",
    )

    assert result == ANALYSIS
    assert len(requests) == 1
    assert requests[0].url.path == "/v1beta/interactions"

    body = json.loads(requests[0].content)

    assert body["input"][0]["content"][0] == {
        "data": base64.b64encode(b"image-data").decode(),
        "mime_type": "image/png",
        "type": "image",
    }
    assert body["response_format"]["mime_type"] == "application/json"
    assert body["store"] is False


def test_supported_sdk_serializes_image_embedding(monkeypatch):
    requests = []

    def respond_without_network(self, request, *args, **kwargs):
        requests.append(request)

        return httpx.Response(
            200,
            json={
                "embeddings": [
                    {"values": [1.0] + [0.0] * 767},
                ],
            },
            request=request,
        )

    monkeypatch.setattr(
        httpx.Client,
        "send",
        respond_without_network,
    )

    vector = GeminiVisualAI().embed_image(
        b"image-data",
        "image/png",
    )

    assert len(vector) == 768
    assert len(requests) == 1

    body = json.loads(requests[0].content)

    assert body["requests"][0]["content"]["parts"][0]["inline_data"] == {
        "data": base64.b64encode(b"image-data").decode(),
        "mime_type": "image/png",
    }
    assert body["requests"][0]["outputDimensionality"] == 768


def test_supported_sdk_serializes_text_embeddings(monkeypatch):
    requests = []

    def respond_without_network(self, request, *args, **kwargs):
        body = json.loads(request.content)

        requests.extend(body["requests"])

        return httpx.Response(
            200,
            json={
                "embeddings": [
                    {"values": [1.0] + [0.0] * 767}
                    for _ in body["requests"]
                ],
            },
            request=request,
        )

    monkeypatch.setattr(
        httpx.Client,
        "send",
        respond_without_network,
    )

    ai = GeminiVisualAI()

    ai.embed_texts(["blue"], "query")
    ai.embed_texts(["one", "two"], "document")

    assert [request["taskType"] for request in requests] == [
        "RETRIEVAL_QUERY",
        "RETRIEVAL_DOCUMENT",
        "RETRIEVAL_DOCUMENT",
    ]
    assert all(
        request["outputDimensionality"] == 768
        for request in requests
    )
