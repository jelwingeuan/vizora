from fastapi import HTTPException
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send


TOO_LARGE_DETAIL = "Upload request is too large."


class UploadSizeLimitMiddleware:
    def __init__(self, app: ASGIApp, limits: dict[str, int]) -> None:
        self.app = app
        self.limits = limits

    async def __call__(
        self,
        scope: Scope,
        receive: Receive,
        send: Send,
    ) -> None:
        if scope["type"] != "http" or scope["method"] != "POST":
            await self.app(scope, receive, send)
            return

        limit = self.limits.get(scope["path"])
        if limit is None:
            await self.app(scope, receive, send)
            return

        for name, value in scope["headers"]:
            if name.lower() != b"content-length":
                continue
            try:
                declared_size = int(value)
            except ValueError:
                continue
            if declared_size > limit:
                await JSONResponse(
                    {"detail": TOO_LARGE_DETAIL},
                    status_code=413,
                )(scope, receive, send)
                return

        received = 0

        async def limited_receive():
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > limit:
                    raise HTTPException(
                        status_code=413,
                        detail=TOO_LARGE_DETAIL,
                    )
            return message

        await self.app(scope, limited_receive, send)
