from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.core.security import AccessControlMiddleware, ACCESS_HEADER_NAME
from app.models.image import Image
from app.models.image_embedding import ImageEmbeddingRecord
from app.routers import embeddings


TOKEN = "cached-embedding-owner-token-32-characters"
CURRENT_MODEL = "gemini-embedding-2"


def make_image(public_id: str) -> Image:
    return Image(
        public_id=public_id,
        title="Reference",
        original_filename="reference.png",
        stored_filename=f"{public_id}.png",
        storage_path=f"uploads/{public_id}.png",
        mime_type="image/png",
        file_size=4,
        width=1,
        height=1,
    )


def test_cached_embeddings_require_owner_token_and_omit_missing_ids(
    monkeypatch,
    session_factory,
):
    monkeypatch.setenv("VIZORA_ACCESS_TOKEN", TOKEN)
    monkeypatch.setenv("GEMINI_IMAGE_EMBEDDING_MODEL", CURRENT_MODEL)

    current_id = "11111111-1111-1111-1111-111111111111"
    stale_id = "22222222-2222-2222-2222-222222222222"
    missing_id = "33333333-3333-3333-3333-333333333333"

    with session_factory() as database:
        current = make_image(current_id)
        stale = make_image(stale_id)
        database.add_all([current, stale])
        database.flush()
        database.add_all([
            ImageEmbeddingRecord(
                image_id=current.id,
                embedding=[1.0] + [0.0] * 767,
                dimensions=768,
                model=CURRENT_MODEL,
            ),
            ImageEmbeddingRecord(
                image_id=stale.id,
                embedding=[0.0, 1.0] + [0.0] * 766,
                dimensions=768,
                model="old-model",
            ),
        ])
        database.commit()

    app = FastAPI()
    app.add_middleware(AccessControlMiddleware)
    app.include_router(embeddings.router)

    def override_get_db():
        with session_factory() as database:
            yield database

    app.dependency_overrides[get_db] = override_get_db
    body = {"image_ids": [current_id, stale_id, missing_id]}

    with TestClient(app) as client:
        assert client.post("/api/embeddings/cached", json=body).status_code == 401
        assert client.post(
            "/api/embeddings/cached",
            json=body,
            headers={ACCESS_HEADER_NAME: "invalid"},
        ).status_code == 401

        response = client.post(
            "/api/embeddings/cached",
            json=body,
            headers={ACCESS_HEADER_NAME: TOKEN},
        )

        assert response.status_code == 200
        assert response.headers["cache-control"] == "private, no-store"
        assert list(response.json()["embeddings"]) == [current_id]
        assert response.json()["embeddings"][current_id] == {
            "embedding": [1.0] + [0.0] * 767,
            "dimensions": 768,
            "model": CURRENT_MODEL,
        }
        assert "stored_filename" not in response.text


def test_cached_embeddings_reject_oversized_id_batches(monkeypatch):
    monkeypatch.setenv("VIZORA_ACCESS_TOKEN", TOKEN)
    app = FastAPI()
    app.add_middleware(AccessControlMiddleware)
    app.include_router(embeddings.router)

    with TestClient(app) as client:
        response = client.post(
            "/api/embeddings/cached",
            json={"image_ids": [str(index) for index in range(101)]},
            headers={ACCESS_HEADER_NAME: TOKEN},
        )

    assert response.status_code == 422
