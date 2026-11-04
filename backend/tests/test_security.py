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
    SecurityHeadersMiddleware,
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


def test_owner_rate_limit_is_shared_across_client_hosts(
    monkeypatch,
):
    configure_production(monkeypatch)
    monkeypatch.setenv("VIZORA_RATE_LIMITING_ENABLED", "true")
    monkeypatch.setenv("VIZORA_AI_RATE_LIMIT_PER_MINUTE", "2")

    app = create_test_app()
    headers = {ACCESS_HEADER_NAME: TEST_TOKEN}

    with (
        TestClient(app, client=("first-host", 5000)) as first,
        TestClient(app, client=("second-host", 5000)) as second,
    ):
        statuses = [
            first.post("/api/ai/test", headers=headers).status_code,
            second.post("/api/ai/test", headers=headers).status_code,
            first.post("/api/ai/test", headers=headers).status_code,
        ]

    assert statuses == [200, 200, 429]


def test_tokenless_development_rate_limit_uses_client_host(
    monkeypatch,
):
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.delenv("VIZORA_ACCESS_TOKEN", raising=False)
    monkeypatch.setenv("VIZORA_RATE_LIMITING_ENABLED", "true")
    monkeypatch.setenv("VIZORA_AI_RATE_LIMIT_PER_MINUTE", "1")

    app = create_test_app()

    with (
        TestClient(app, client=("first-host", 5000)) as first,
        TestClient(app, client=("second-host", 5000)) as second,
    ):
        statuses = [
            first.post("/api/ai/test").status_code,
            second.post("/api/ai/test").status_code,
            first.post("/api/ai/test").status_code,
        ]

    assert statuses == [200, 200, 429]


@pytest.mark.parametrize(
    "origins",
    [
        None,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://example.com",
        "https://*.vercel.app",
        "https://EXAMPLE.com",
        "https://example.com:443",
        "https://example.com/path",
        "https://example.com:bad",
    ],
)
def test_production_startup_requires_exact_public_cors_origin(
    monkeypatch,
    origins,
):
    from app import main

    configure_production(monkeypatch)

    if origins is None:
        monkeypatch.delenv("CORS_ORIGINS", raising=False)
    else:
        monkeypatch.setenv("CORS_ORIGINS", origins)

    with pytest.raises(RuntimeError, match="CORS_ORIGINS"):
        with TestClient(main.app):
            pass


def test_production_startup_accepts_exact_public_cors_origin(
    monkeypatch,
):
    from app import main

    configure_production(monkeypatch)
    monkeypatch.setenv("CORS_ORIGINS", "https://vizora.example.com")
    monkeypatch.setattr(main, "initialize_database", lambda: None)

    with TestClient(main.app) as client:
        assert client.get("/api/health").status_code == 200


def test_missing_app_env_fails_closed(
    monkeypatch,
):
    monkeypatch.delenv(
        "APP_ENV",
        raising=False,
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


def test_non_ascii_token_is_rejected(
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

                headers={
                    ACCESS_HEADER_NAME:
                        b"\xff-not-ascii",
                },
            )
        )

        assert (
            response.status_code
            == 401
        )


def test_security_headers_on_all_responses(
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

    app.add_middleware(
        SecurityHeadersMiddleware,
    )

    with TestClient(
        app,
    ) as client:
        rejected = (
            client.get(
                "/api/private",
            )
        )

        allowed = (
            client.get(
                "/api/private",

                headers={
                    ACCESS_HEADER_NAME:
                        TEST_TOKEN,
                },
            )
        )

        for response in (
            rejected,
            allowed,
        ):
            assert (
                response.headers[
                    "X-Content-Type-Options"
                ]
                == "nosniff"
            )

            assert (
                response.headers[
                    "X-Frame-Options"
                ]
                == "DENY"
            )

            assert (
                response.headers[
                    "Referrer-Policy"
                ]
                == "no-referrer"
            )

        assert (
            rejected.status_code
            == 401
        )

        assert (
            allowed.status_code
            == 200
        )


def test_api_docs_hidden_in_production(
    monkeypatch,
):
    from app.main import (
        get_docs_configuration,
    )

    configure_production(
        monkeypatch,
    )

    assert (
        get_docs_configuration()
        == {
            "docs_url": None,
            "redoc_url": None,
            "openapi_url": None,
        }
    )

    monkeypatch.setenv(
        "APP_ENV",
        "development",
    )

    assert (
        get_docs_configuration()
        == {}
    )
