import asyncio
import base64
import json

from io import BytesIO
from types import SimpleNamespace

import pytest

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from PIL import Image as PillowImage

from app.routers import ai, embeddings
from app.schemas.analysis import ImageAnalysis
from app.services import ai_service, embedding_service


def create_fake_embedding_client(
    values: list[float],
    calls: dict,
):
    class FakeModels:
        async def embed_content(self, **kwargs):
            calls["request"] = kwargs
            return SimpleNamespace(
                embeddings=[
                    SimpleNamespace(values=values),
                ],
            )

    class FakeAio:
        models = FakeModels()

        async def aclose(self):
            calls["async_closed"] = True

    class FakeClient:
        aio = FakeAio()

        def close(self):
            calls["sync_closed"] = True

    return FakeClient()


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
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(
        embedding_service.genai,
        "Client",
        lambda api_key: create_fake_embedding_client(
            [1.0] + [0.0] * 767,
            calls,
        ),
    )

    app = FastAPI()
    app.include_router(embeddings.router)

    with TestClient(app) as client:
        response = client.post(
            "/api/embeddings/image",
            files={
                "image": (
                    "reference.webp",
                    image_buffer.getvalue(),
                    "image/webp",
                ),
            },
        )

    assert response.status_code == 200
    assert response.json()["dimensions"] == 768
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
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(
        embedding_service.genai,
        "Client",
        lambda api_key: create_fake_embedding_client(
            values,
            calls,
        ),
    )

    with pytest.raises(embedding_service.ImageEmbeddingError):
        asyncio.run(
            embedding_service.generate_image_embedding(
                b"image",
                "image/png",
            )
        )

    assert calls["sync_closed"] is True
    assert calls["async_closed"] is True


def test_ai_inline_budget_and_temporary_size_limit():
    encoded_size = 4 * (
        (ai_service.MAX_INLINE_IMAGE_SIZE + 2) // 3
    )
    overhead = len(
        json.dumps(
            ImageAnalysis.model_json_schema()
        ).encode()
    ) + len(ai_service.ANALYSIS_PROMPT.encode()) + 1024
    assert encoded_size + overhead < 20_000_000

    app = FastAPI()
    app.include_router(ai.router)

    with TestClient(app) as client:
        response = client.post(
            "/api/ai/analyze",
            files={
                "image": (
                    "too-large.png",
                    b"x" * (ai_service.MAX_INLINE_IMAGE_SIZE + 1),
                    "image/png",
                ),
            },
        )

    assert response.status_code == 413
    assert response.json()["detail"] == (
        ai_service.INLINE_IMAGE_TOO_LARGE_DETAIL
    )


def test_ai_stored_size_limit_prevents_provider_call(monkeypatch):
    monkeypatch.setattr(
        ai,
        "find_stored_image_by_public_id",
        lambda database, image_id: SimpleNamespace(
            mime_type="image/png",
            file_size=ai_service.MAX_INLINE_IMAGE_SIZE + 1,
        ),
    )

    with pytest.raises(HTTPException) as error:
        asyncio.run(
            ai.analyze_stored_image(
                "stored-image",
                database=object(),
            )
        )

    assert error.value.status_code == 413


def test_ai_service_parses_response_and_closes_clients(monkeypatch):
    analysis = ImageAnalysis(
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
    calls = {}

    class FakeInteractions:
        def create(self, **kwargs):
            calls["request"] = kwargs
            return SimpleNamespace(
                output_text=analysis.model_dump_json(),
            )

    class FakeAio:
        async def aclose(self):
            calls["async_closed"] = True

    class FakeClient:
        interactions = FakeInteractions()
        aio = FakeAio()

        def close(self):
            calls["sync_closed"] = True

    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(
        ai_service.genai,
        "Client",
        lambda api_key: FakeClient(),
    )

    result = ai_service.analyze_image_bytes(
        b"image-data",
        "image/png",
    )

    assert result == analysis
    assert calls["sync_closed"] is True
    assert calls["async_closed"] is True
    assert calls["request"]["input"][0]["data"] == (
        base64.b64encode(b"image-data").decode()
    )


def test_ai_service_rejects_oversize_before_client_creation(
    monkeypatch,
):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")

    def fail_if_client_created(api_key):
        raise AssertionError("Provider client should not be created")

    monkeypatch.setattr(
        ai_service.genai,
        "Client",
        fail_if_client_created,
    )

    with pytest.raises(ai_service.AIImageSizeError):
        ai_service.analyze_image_bytes(
            b"x" * (ai_service.MAX_INLINE_IMAGE_SIZE + 1),
            "image/png",
        )
