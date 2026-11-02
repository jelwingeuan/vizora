from types import SimpleNamespace

import pytest

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers import search
from app.services import search_service


@pytest.mark.parametrize(
    "count",
    [251, 500],
)
def test_semantic_search_ranks_last_reference(
    count: int,
    monkeypatch,
):
    embedded_documents: list[str] = []

    class FakeModels:
        def embed_content(
            self,
            model,
            contents,
            config,
        ):
            if isinstance(contents, str):
                return SimpleNamespace(
                    embeddings=[
                        SimpleNamespace(values=[1.0, 0.0]),
                    ],
                )

            embedded_documents.extend(contents)

            return SimpleNamespace(
                embeddings=[
                    SimpleNamespace(values=[1.0, 0.0])
                    for _ in contents
                ],
            )

    class FakeClient:
        models = FakeModels()

        def close(self):
            pass

    monkeypatch.setenv(
        "GEMINI_API_KEY",
        "test-key",
    )

    monkeypatch.setattr(
        search_service.genai,
        "Client",
        lambda api_key: FakeClient(),
    )

    app = FastAPI()
    app.include_router(search.router)

    items = [
        {
            "id": f"image-{index}",
            "title": f"Reference {index}",
            "text": (
                "needle" if index == count - 1
                else "Creative visual reference metadata."
            ),
        }
        for index in range(count)
    ]

    with TestClient(app) as client:
        response = client.post(
            "/api/search/semantic",
            json={
                "query": "needle",
                "items": items,
            },
        )

    assert response.status_code == 200
    assert len(embedded_documents) == count
    assert response.json()["results"][0]["id"] == f"image-{count - 1}"
    assert len(response.json()["results"]) == 12
