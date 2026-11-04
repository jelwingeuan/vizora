import json

from types import SimpleNamespace

import httpx
import pytest

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers import search
from app.schemas.search import SemanticSearchItem
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

        class aio:
            @staticmethod
            async def aclose():
                pass

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


def test_semantic_search_reuses_unchanged_document_embeddings(monkeypatch):
    calls = {"query": 0, "documents": 0, "closed": 0, "async_closed": 0}

    class FakeModels:
        def embed_content(self, model, contents, config):
            if isinstance(contents, str):
                calls["query"] += 1
                count = 1
            else:
                calls["documents"] += 1
                count = len(contents)

            return SimpleNamespace(
                embeddings=[SimpleNamespace(values=[1.0, 0.0]) for _ in range(count)],
            )

    class FakeClient:
        models = FakeModels()

        class aio:
            @staticmethod
            async def aclose():
                calls["async_closed"] += 1

        def close(self):
            calls["closed"] += 1

    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.delenv("GEMINI_EMBEDDING_MODEL", raising=False)
    monkeypatch.setattr(search_service.genai, "Client", lambda api_key: FakeClient())
    search_service.cached_document_embeddings.cache_clear()

    app = FastAPI()
    app.include_router(search.router)
    items = [{"id": "one", "title": "One", "text": "blue"}]

    try:
        with TestClient(app) as client:
            for query in ("blue", "color"):
                response = client.post(
                    "/api/search/semantic",
                    json={"query": query, "items": items},
                )
                assert response.status_code == 200

            changed = client.post(
                "/api/search/semantic",
                json={"query": "blue", "items": [{**items[0], "text": "green"}]},
            )
            assert changed.status_code == 200

        assert calls == {
            "query": 3,
            "documents": 2,
            "closed": 5,
            "async_closed": 5,
        }
    finally:
        search_service.cached_document_embeddings.cache_clear()


def test_semantic_search_rejects_incompatible_embedding_model(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-2")

    app = FastAPI()
    app.include_router(search.router)

    with TestClient(app) as client:
        response = client.post(
            "/api/search/semantic",
            json={
                "query": "blue",
                "items": [{"id": "one", "title": "One", "text": "blue"}],
            },
        )

    assert response.status_code == 503
    assert "gemini-embedding-001" in response.json()["detail"]


def test_supported_sdk_serializes_search_embeddings(monkeypatch):
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

    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.delenv("GEMINI_EMBEDDING_MODEL", raising=False)
    monkeypatch.setattr(httpx.Client, "send", respond_without_network)
    search_service.cached_document_embeddings.cache_clear()

    try:
        results = search_service._semantic_search_sync(
            "blue",
            [SemanticSearchItem(id="one", title="One", text="blue")],
        )

        assert results[0].id == "one"
        assert [request["taskType"] for request in requests] == [
            "RETRIEVAL_QUERY",
            "RETRIEVAL_DOCUMENT",
        ]
        assert all(request["outputDimensionality"] == 768 for request in requests)
    finally:
        search_service.cached_document_embeddings.cache_clear()
