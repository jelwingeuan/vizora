from io import BytesIO

import pytest

from fastapi.testclient import (
    TestClient,
)

from PIL import (
    Image as PillowImage,
)

from sqlalchemy.orm import (
    Session,
)

from app.schemas.analysis import (
    ImageAnalysis,
)

from app.services.analysis_store_service import (
    persist_image_analysis,
)

from app.services.image_service import (
    find_stored_image_by_public_id,
)

from app.services.visual_ai import (
    AIConfigurationError,
    INLINE_IMAGE_TOO_LARGE_DETAIL,
    MAX_INLINE_IMAGE_SIZE,
)

from tests.fakes import (
    FakeVisualAI,
)


def create_png(
    color: tuple[int, int, int],
) -> bytes:
    buffer = BytesIO()

    PillowImage.new(
        "RGB",
        (8, 8),
        color,
    ).save(
        buffer,
        format="PNG",
    )

    return buffer.getvalue()


def upload(
    client: TestClient,
    filename: str,
    contents: bytes,
) -> str:
    response = client.post(
        "/api/images",
        files=[
            (
                "images",
                (filename, contents, "image/png"),
            ),
        ],
    )

    assert response.status_code == 201, response.text

    return response.json()[0]["id"]


def analyze(
    db_session: Session,
    public_id: str,
    tags: list[str],
) -> None:
    image = find_stored_image_by_public_id(
        db_session,
        public_id,
    )

    persist_image_analysis(
        db_session,
        image,
        ImageAnalysis(
            summary=" ".join(tags),
            subject=tags[0],
            style=tags,
            mood=["neutral"],
            lighting="soft",
            composition="centered",
            color_palette=["#000000"],
            tags=tags,
            creative_notes="Reference.",
        ),
    )


def result_ids(
    response,
) -> list[str]:
    assert response.status_code == 200, response.text

    return [
        result["id"]
        for result in response.json()["results"]
    ]


def test_semantic_search_ranks_matching_analysis(
    client: TestClient,
    db_session: Session,
):
    neon_id = upload(client, "street.png", create_png((10, 10, 10)))
    forest_id = upload(client, "trail.png", create_png((20, 20, 20)))

    analyze(db_session, neon_id, ["neon", "cyberpunk", "night"])
    analyze(db_session, forest_id, ["forest", "moss", "morning"])

    response = client.post(
        "/api/search/semantic",
        json={"query": "neon cyberpunk night"},
    )

    assert result_ids(response) == [neon_id]


def test_semantic_search_reuses_document_embeddings(
    client: TestClient,
    db_session: Session,
    fake_ai: FakeVisualAI,
):
    first_id = upload(client, "first.png", create_png((10, 10, 10)))
    upload(client, "second.png", create_png((20, 20, 20)))

    client.post("/api/search/semantic", json={"query": "first"})

    assert [
        task for task, _ in fake_ai.embedded_texts
    ] == ["document", "document", "query"]

    fake_ai.embedded_texts.clear()

    client.post("/api/search/semantic", json={"query": "first"})

    assert [
        task for task, _ in fake_ai.embedded_texts
    ] == ["query"]

    fake_ai.embedded_texts.clear()

    client.patch(f"/api/images/{first_id}", json={"title": "Renamed"})

    client.post("/api/search/semantic", json={"query": "renamed"})

    assert [
        (task, text.splitlines()[0])
        for task, text in fake_ai.embedded_texts
    ] == [
        ("document", "Title: Renamed"),
        ("query", "renamed"),
    ]


def test_semantic_search_returns_503_without_ai_configuration(
    client: TestClient,
    fake_ai: FakeVisualAI,
):
    upload(client, "image.png", create_png((10, 10, 10)))

    fake_ai.error = AIConfigurationError(
        "GEMINI_API_KEY is not configured."
    )

    response = client.post(
        "/api/search/semantic",
        json={"query": "anything"},
    )

    assert response.status_code == 503


def test_similar_ranks_by_visual_closeness_and_caches(
    client: TestClient,
    fake_ai: FakeVisualAI,
):
    red_id = upload(client, "red.png", create_png((250, 10, 10)))
    dark_red_id = upload(client, "dark-red.png", create_png((180, 20, 20)))
    upload(client, "blue.png", create_png((10, 10, 250)))

    response = client.post(f"/api/search/similar/{red_id}")

    assert result_ids(response) == [dark_red_id]
    assert fake_ai.embedded_image_count == 3

    client.post(f"/api/search/similar/{dark_red_id}")

    assert fake_ai.embedded_image_count == 3


def test_similar_reports_failed_candidate_and_resumes_on_retry(
    client: TestClient,
    fake_ai: FakeVisualAI,
):
    broken = create_png((240, 0, 0))

    red_id = upload(client, "red.png", create_png((250, 10, 10)))
    broken_id = upload(client, "broken.png", broken)
    dark_red_id = upload(client, "dark-red.png", create_png((180, 20, 20)))

    fake_ai.failing_images.add(broken)

    response = client.post(f"/api/search/similar/{red_id}")

    assert response.status_code == 502
    assert fake_ai.embedded_image_count == 2

    fake_ai.failing_images.clear()

    response = client.post(f"/api/search/similar/{red_id}")

    assert set(result_ids(response)) == {broken_id, dark_red_id}
    assert fake_ai.embedded_image_count == 3


def test_similar_fails_when_source_cannot_be_embedded(
    client: TestClient,
    fake_ai: FakeVisualAI,
):
    source = create_png((250, 10, 10))

    source_id = upload(client, "red.png", source)
    upload(client, "dark-red.png", create_png((180, 20, 20)))

    fake_ai.failing_images.add(source)

    response = client.post(f"/api/search/similar/{source_id}")

    assert response.status_code == 502


@pytest.mark.parametrize(
    "path",
    [
        "/api/search/similar/missing",
        "/api/ai/analyze/missing",
    ],
)
def test_unknown_image_returns_404(
    client: TestClient,
    path: str,
):
    assert client.post(path).status_code == 404


def test_analysis_is_persisted_and_listed(
    client: TestClient,
    fake_ai: FakeVisualAI,
):
    image_id = upload(client, "swatch.png", create_png((120, 80, 200)))

    response = client.post(f"/api/ai/analyze/{image_id}")

    assert response.status_code == 200, response.text
    assert response.json()["tags"] == fake_ai.analysis.tags

    [listed] = client.get("/api/images").json()

    assert listed["analysis"]["tags"] == fake_ai.analysis.tags


def test_oversized_stored_image_is_rejected_before_analysis(
    client: TestClient,
    db_session: Session,
    fake_ai: FakeVisualAI,
):
    image_id = upload(client, "swatch.png", create_png((120, 80, 200)))

    image = find_stored_image_by_public_id(
        db_session,
        image_id,
    )

    image.file_size = MAX_INLINE_IMAGE_SIZE + 1

    db_session.commit()

    fake_ai.error = AssertionError(
        "The provider should not be called."
    )

    response = client.post(f"/api/ai/analyze/{image_id}")

    assert response.status_code == 413
    assert response.json()["detail"] == (
        INLINE_IMAGE_TOO_LARGE_DETAIL
    )
