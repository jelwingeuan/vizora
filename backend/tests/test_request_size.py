import pytest

from fastapi import FastAPI, File, UploadFile
from fastapi.testclient import TestClient

from app.core.request_size import UploadSizeLimitMiddleware
from app.main import UPLOAD_BODY_LIMITS, app as main_app


@pytest.mark.parametrize("path", UPLOAD_BODY_LIMITS)
def test_declared_oversized_upload_is_rejected(path: str):
    client = TestClient(main_app)
    try:
        response = client.post(
            path,
            content=b"x",
            headers={
                "Content-Length": str(UPLOAD_BODY_LIMITS[path] + 1),
                "Content-Type": "multipart/form-data; boundary=test",
            },
        )
    finally:
        client.close()

    assert response.status_code == 413
    assert response.json()["detail"] == "Upload request is too large."


@pytest.mark.parametrize(
    "path,field",
    [
        ("/api/images", "images"),
        ("/api/ai/analyze", "image"),
        ("/api/embeddings/image", "image"),
    ],
)
def test_streamed_oversized_upload_is_rejected(
    path: str,
    field: str,
    monkeypatch,
):
    monkeypatch.setitem(UPLOAD_BODY_LIMITS, path, 64)

    boundary = "test"
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="{field}"; filename="x.png"\r\n'
        "Content-Type: image/png\r\n\r\n"
    ).encode() + b"image-data\r\n--test--\r\n"

    client = TestClient(main_app)
    try:
        request = client.build_request(
            "POST",
            path,
            content=iter((body[:40], body[40:])),
            headers={
                "Content-Type": f"multipart/form-data; boundary={boundary}",
            },
        )
        assert "content-length" not in request.headers
        response = client.send(request)
    finally:
        client.close()

    assert response.status_code == 413
    assert response.json()["detail"] == "Upload request is too large."


def test_upload_within_body_limit_is_parsed(sample_png_bytes: bytes):
    app = FastAPI()
    app.add_middleware(
        UploadSizeLimitMiddleware,
        limits={"/api/images": 1024 * 1024},
    )

    @app.post("/api/images")
    async def upload(images: list[UploadFile] = File(...)):
        return {"size": len(await images[0].read())}

    with TestClient(app) as client:
        response = client.post(
            "/api/images",
            files={"images": ("x.png", sample_png_bytes, "image/png")},
        )

    assert response.status_code == 200
    assert response.json() == {"size": len(sample_png_bytes)}
