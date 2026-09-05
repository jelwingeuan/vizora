from collections.abc import (
    Callable,
    Generator,
)

from io import BytesIO

from pathlib import Path

import pytest

from fastapi import (
    FastAPI,
)

from fastapi.staticfiles import (
    StaticFiles,
)

from fastapi.testclient import (
    TestClient,
)

from PIL import (
    Image as PillowImage,
)

from sqlalchemy import (
    create_engine,
    event,
)

from sqlalchemy.engine import (
    Engine,
)

from sqlalchemy.orm import (
    Session,
    sessionmaker,
)

import app.models  # noqa: F401
import app.services.image_service as image_service

from app.core.database import (
    Base,
    get_db,
)

from app.routers import (
    boards,
    health,
    images,
)


@pytest.fixture()
def test_engine(
    tmp_path: Path,
) -> Generator[
    Engine,
    None,
    None,
]:
    database_path = (
        tmp_path
        / "vizora-test.db"
    )

    engine = create_engine(
        (
            "sqlite:///"
            f"{database_path.as_posix()}"
        ),

        connect_args={
            "check_same_thread":
                False,
        },
    )


    @event.listens_for(
        engine,
        "connect",
    )
    def enable_foreign_keys(
        dbapi_connection,
        _,
    ) -> None:
        cursor = (
            dbapi_connection.cursor()
        )

        try:
            cursor.execute(
                "PRAGMA foreign_keys=ON"
            )

        finally:
            cursor.close()


    Base.metadata.create_all(
        bind=engine,
    )

    try:
        yield engine

    finally:
        Base.metadata.drop_all(
            bind=engine,
        )

        engine.dispose()


@pytest.fixture()
def session_factory(
    test_engine: Engine,
):
    return sessionmaker(
        bind=test_engine,
        autoflush=False,
        expire_on_commit=False,
    )


@pytest.fixture()
def uploads_dir(
    tmp_path: Path,
    monkeypatch,
) -> Path:
    directory = (
        tmp_path
        / "uploads"
    )

    directory.mkdir(
        parents=True,
        exist_ok=True,
    )

    monkeypatch.setattr(
        image_service,
        "UPLOADS_DIR",
        directory,
    )

    return directory


@pytest.fixture()
def client(
    session_factory,
    uploads_dir: Path,
) -> Generator[
    TestClient,
    None,
    None,
]:
    test_app = (
        FastAPI()
    )

    test_app.mount(
        "/uploads",

        StaticFiles(
            directory=str(
                uploads_dir,
            ),
        ),

        name="uploads",
    )

    test_app.include_router(
        health.router,
    )

    test_app.include_router(
        images.router,
    )

    test_app.include_router(
        boards.router,
    )


    def override_get_db():
        database = (
            session_factory()
        )

        try:
            yield database

        finally:
            database.close()


    test_app.dependency_overrides[
        get_db
    ] = override_get_db


    with TestClient(
        test_app,
    ) as test_client:
        yield test_client


    test_app.dependency_overrides.clear()


@pytest.fixture()
def db_session(
    session_factory,
) -> Generator[
    Session,
    None,
    None,
]:
    database = (
        session_factory()
    )

    try:
        yield database

    finally:
        database.close()


@pytest.fixture()
def sample_png_bytes() -> bytes:
    buffer = (
        BytesIO()
    )

    image = (
        PillowImage.new(
            "RGB",

            (
                8,
                6,
            ),

            (
                120,
                80,
                200,
            ),
        )
    )

    image.save(
        buffer,
        format="PNG",
    )

    return (
        buffer.getvalue()
    )


@pytest.fixture()
def upload_image(
    client: TestClient,
    sample_png_bytes: bytes,
) -> Callable[
    [str],
    dict,
]:
    def create_upload(
        filename:
            str = "reference.png",
    ) -> dict:
        response = (
            client.post(
                "/api/images",

                files=[
                    (
                        "images",

                        (
                            filename,
                            sample_png_bytes,
                            "image/png",
                        ),
                    ),
                ],
            )
        )

        assert (
            response.status_code
            == 201
        ), response.text

        payload = (
            response.json()
        )

        assert (
            len(payload)
            == 1
        )

        return (
            payload[0]
        )

    return create_upload