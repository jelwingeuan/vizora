def test_main_app_imports_and_registers_core_routes():
    from app.main import app

    openapi_schema = (
        app.openapi()
    )

    registered_paths = set(
        openapi_schema.get(
            "paths",
            {},
        )
    )

    expected_paths = {
        "/api/health",
        "/api/access",
        "/api/images",
        "/api/search/semantic",
    }

    missing_paths = (
        expected_paths
        - registered_paths
    )

    assert not missing_paths, (
        "Missing expected API routes: "
        f"{sorted(missing_paths)}"
    )