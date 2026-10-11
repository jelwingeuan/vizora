from pathlib import Path
from urllib.parse import urlsplit

from fastapi.testclient import (
    TestClient,
)

from app.core.security import (
    ACCESS_HEADER_NAME,
)


def test_upload_and_list_image(
    client: TestClient,
    uploads_dir: Path,
    sample_png_bytes: bytes,
):
    response = (
        client.post(
            "/api/images",

            files=[
                (
                    "images",

                    (
                        "test-reference.png",
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
    )

    payload = (
        response.json()
    )

    assert (
        len(payload)
        == 1
    )


    image = (
        payload[0]
    )

    assert (
        image["title"]
        == "test-reference"
    )

    assert (
        image["original_filename"]
        == "test-reference.png"
    )

    assert (
        image["width"]
        == 8
    )

    assert (
        image["height"]
        == 6
    )

    assert (
        image["source"]
        == "upload"
    )

    assert (
        image["is_favorite"]
        is False
    )

    assert (
        image["analysis"]
        is None
    )


    stored_files = [
        path
        for path
        in uploads_dir.iterdir()
        if path.is_file()
    ]

    assert (
        len(stored_files)
        == 1
    )


    list_response = (
        client.get(
            "/api/images",
        )
    )

    assert (
        list_response.status_code
        == 200
    )

    listed_images = (
        list_response.json()
    )

    assert (
        len(listed_images)
        == 1
    )

    assert (
        listed_images[0]["id"]
        == image["id"]
    )


def test_uploaded_image_file_requires_access(
    client: TestClient,
    upload_image,
    uploads_dir: Path,
    sample_png_bytes: bytes,
    monkeypatch,
):
    monkeypatch.setenv(
        "APP_ENV",
        "test",
    )

    monkeypatch.delenv(
        "VIZORA_ACCESS_TOKEN",
        raising=False,
    )

    image = upload_image()

    image_path = (
        urlsplit(
            image["url"],
        ).path
    )

    stored_filename = (
        next(
            uploads_dir.iterdir()
        ).name
    )

    assert image_path == (
        f"/api/images/{image['id']}/file"
    )

    assert stored_filename not in image["url"]

    owner_token = (
        "0123456789abcdef"
        "0123456789abcdef"
    )

    monkeypatch.setenv(
        "APP_ENV",
        "production",
    )

    monkeypatch.setenv(
        "VIZORA_ACCESS_TOKEN",
        owner_token,
    )

    assert client.get(
        image_path,
    ).status_code == 401

    assert client.get(
        image_path,
        headers={
            ACCESS_HEADER_NAME:
                "wrong-token",
        },
    ).status_code == 401

    headers = {
        ACCESS_HEADER_NAME:
            owner_token,
    }

    response = client.get(
        image_path,
        headers=headers,
    )

    assert response.status_code == 200
    assert response.content == sample_png_bytes
    assert response.headers["content-type"] == "image/png"
    assert response.headers["cache-control"] == "private, no-store"

    assert client.get(
        "/api/images/missing/file",
        headers=headers,
    ).status_code == 404

    assert client.get(
        f"/uploads/{stored_filename}",
    ).status_code == 404

    (uploads_dir / stored_filename).unlink()

    assert client.get(
        image_path,
        headers=headers,
    ).status_code == 404


def test_rename_and_favorite_image(
    client: TestClient,
    upload_image,
):
    image = (
        upload_image(
            "original.png",
        )
    )


    rename_response = (
        client.patch(
            (
                "/api/images/"
                f"{image['id']}"
            ),

            json={
                "title":
                    "  Campaign Reference  ",
            },
        )
    )

    assert (
        rename_response.status_code
        == 200
    )

    assert (
        rename_response.json()[
            "title"
        ]
        == "Campaign Reference"
    )


    favorite_response = (
        client.patch(
            (
                "/api/images/"
                f"{image['id']}"
                "/favorite"
            ),

            json={
                "is_favorite":
                    True,
            },
        )
    )

    assert (
        favorite_response.status_code
        == 200
    )

    assert (
        favorite_response.json()[
            "is_favorite"
        ]
        is True
    )


    list_response = (
        client.get(
            "/api/images",
        )
    )

    stored_image = (
        list_response.json()[0]
    )

    assert (
        stored_image["title"]
        == "Campaign Reference"
    )

    assert (
        stored_image["is_favorite"]
        is True
    )


def test_reject_unsupported_upload(
    client: TestClient,
):
    response = (
        client.post(
            "/api/images",

            files=[
                (
                    "images",

                    (
                        "notes.txt",
                        b"not an image",
                        "text/plain",
                    ),
                ),
            ],
        )
    )

    assert (
        response.status_code
        == 415
    )


def test_reject_blank_title(
    client: TestClient,
    upload_image,
):
    image = (
        upload_image()
    )

    response = (
        client.patch(
            (
                "/api/images/"
                f"{image['id']}"
            ),

            json={
                "title":
                    "   ",
            },
        )
    )

    assert (
        response.status_code
        == 400
    )

    assert (
        response.json()[
            "detail"
        ]
        == (
            "Image title "
            "cannot be empty."
        )
    )


def test_missing_image_returns_404(
    client: TestClient,
):
    rename_response = (
        client.patch(
            (
                "/api/images/"
                "missing-image"
            ),

            json={
                "title":
                    "Test",
            },
        )
    )

    assert (
        rename_response.status_code
        == 404
    )


    delete_response = (
        client.delete(
            (
                "/api/images/"
                "missing-image"
            )
        )
    )

    assert (
        delete_response.status_code
        == 404
    )