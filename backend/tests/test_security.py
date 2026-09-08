import pytest

from fastapi import (
    FastAPI,
)

from fastapi.testclient import (
    TestClient,
)

from app.core.security import (
    ACCESS_HEADER_NAME,
    AccessControlMiddleware,
    RateLimitMiddleware,
    validate_security_configuration,
)


TEST_TOKEN = (
    "vizora-test-token-"
    "123456789012345678901234567890"
)


def create_test_app() -> FastAPI:
    app = FastAPI()

    app.add_middleware(
        RateLimitMiddleware,
    )

    app.add_middleware(
        AccessControlMiddleware,
    )

    @app.get(
        "/api/private",
    )
    def private_route():
        return {
            "status":
                "ok",
        }

    @app.post(
        "/api/ai/test",
    )
    def ai_route():
        return {
            "status":
                "ok",
        }

    @app.get(
        "/api/health",
    )
    def health_route():
        return {
            "status":
                "ok",
        }

    return app


def configure_production(
    monkeypatch,
):
    monkeypatch.setenv(
        "APP_ENV",
        "production",
    )

    monkeypatch.setenv(
        "VIZORA_ACCESS_TOKEN",
        TEST_TOKEN,
    )


def test_protected_api_requires_token(
    monkeypatch,
):
    configure_production(
        monkeypatch,
    )

    monkeypatch.setenv(
        "VIZORA_RATE_LIMITING_ENABLED",
        "false",
    )

    app = (
        create_test_app()
    )

    with TestClient(
        app,
    ) as client:
        response = (
            client.get(
                "/api/private",
            )
        )

        assert (
            response.status_code
            == 401
        )

        response = (
            client.get(
                "/api/private",

                headers={
                    ACCESS_HEADER_NAME:
                        TEST_TOKEN,
                },
            )
        )

        assert (
            response.status_code
            == 200
        )


def test_health_remains_public(
    monkeypatch,
):
    configure_production(
        monkeypatch,
    )

    monkeypatch.setenv(
        "VIZORA_RATE_LIMITING_ENABLED",
        "false",
    )

    app = (
        create_test_app()
    )

    with TestClient(
        app,
    ) as client:
        response = (
            client.get(
                "/api/health",
            )
        )

        assert (
            response.status_code
            == 200
        )


def test_production_requires_strong_token(
    monkeypatch,
):
    monkeypatch.setenv(
        "APP_ENV",
        "production",
    )

    monkeypatch.setenv(
        "VIZORA_ACCESS_TOKEN",
        "too-short",
    )

    with pytest.raises(
        RuntimeError,
        match=(
            "VIZORA_ACCESS_TOKEN"
        ),
    ):
        validate_security_configuration()


def test_ai_rate_limit(
    monkeypatch,
):
    configure_production(
        monkeypatch,
    )

    monkeypatch.setenv(
        "VIZORA_RATE_LIMITING_ENABLED",
        "true",
    )

    monkeypatch.setenv(
        "VIZORA_AI_RATE_LIMIT_PER_MINUTE",
        "2",
    )

    app = (
        create_test_app()
    )

    headers = {
        ACCESS_HEADER_NAME:
            TEST_TOKEN,
    }

    with TestClient(
        app,
    ) as client:
        first = (
            client.post(
                "/api/ai/test",
                headers=headers,
            )
        )

        second = (
            client.post(
                "/api/ai/test",
                headers=headers,
            )
        )

        third = (
            client.post(
                "/api/ai/test",
                headers=headers,
            )
        )

        assert (
            first.status_code
            == 200
        )

        assert (
            second.status_code
            == 200
        )

        assert (
            third.status_code
            == 429
        )

        assert (
            "Retry-After"
            in third.headers
        )