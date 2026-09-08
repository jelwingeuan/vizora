import hashlib
import hmac
import math
import os
import time

from collections import (
    defaultdict,
    deque,
)

from dataclasses import (
    dataclass,
)

from pathlib import Path

from threading import (
    Lock,
)

from dotenv import (
    load_dotenv,
)

from fastapi import (
    Request,
)

from starlette.middleware.base import (
    BaseHTTPMiddleware,
    RequestResponseEndpoint,
)

from starlette.responses import (
    JSONResponse,
    Response,
)


BACKEND_ROOT = (
    Path(__file__)
    .resolve()
    .parents[2]
)


load_dotenv(
    BACKEND_ROOT
    / ".env",
)


ACCESS_HEADER_NAME = (
    "X-Vizora-Token"
)


VALID_ENVIRONMENTS = {
    "development",
    "test",
    "production",
}


PUBLIC_API_PATHS = {
    "/api/health",
}


RATE_LIMIT_WINDOW_SECONDS = (
    60.0
)


DEFAULT_AI_RATE_LIMIT = (
    12
)


DEFAULT_SEARCH_RATE_LIMIT = (
    10
)


DEFAULT_EMBEDDING_RATE_LIMIT = (
    240
)


DEFAULT_UPLOAD_RATE_LIMIT = (
    6
)


TRUE_VALUES = {
    "1",
    "true",
    "yes",
    "on",
}


FALSE_VALUES = {
    "0",
    "false",
    "no",
    "off",
}


@dataclass(
    frozen=True,
    slots=True,
)
class RateLimitRule:
    name: str

    limit: int


def get_app_environment() -> str:
    value = (
        os.getenv(
            "APP_ENV",
            "development",
        )
        .strip()
        .lower()
    )

    return (
        value
        or "development"
    )


def get_access_token() -> str:
    return (
        os.getenv(
            "VIZORA_ACCESS_TOKEN",
            "",
        )
        .strip()
    )


def is_access_control_enabled() -> bool:
    return (
        get_app_environment()
        == "production"
        or bool(
            get_access_token()
        )
    )


def is_request_authorized(
    request: Request,
) -> bool:
    if not (
        is_access_control_enabled()
    ):
        return True

    expected_token = (
        get_access_token()
    )

    supplied_token = (
        request.headers.get(
            ACCESS_HEADER_NAME,
            "",
        )
        .strip()
    )

    if (
        not expected_token
        or not supplied_token
    ):
        return False

    return hmac.compare_digest(
        supplied_token,
        expected_token,
    )


def is_rate_limiting_enabled() -> bool:
    raw_value = (
        os.getenv(
            "VIZORA_RATE_LIMITING_ENABLED",
            "",
        )
        .strip()
        .lower()
    )

    if not raw_value:
        return (
            get_app_environment()
            == "production"
        )

    if raw_value in TRUE_VALUES:
        return True

    if raw_value in FALSE_VALUES:
        return False

    raise RuntimeError(
        "VIZORA_RATE_LIMITING_ENABLED "
        "must be true or false."
    )


def get_positive_int_setting(
    name: str,
    default: int,
) -> int:
    raw_value = (
        os.getenv(
            name,
            "",
        )
        .strip()
    )

    if not raw_value:
        return default

    try:
        value = int(
            raw_value,
        )

    except ValueError as error:
        raise RuntimeError(
            f"{name} must be "
            "a positive integer."
        ) from error

    if value <= 0:
        raise RuntimeError(
            f"{name} must be "
            "a positive integer."
        )

    return value


def validate_security_configuration() -> None:
    environment = (
        get_app_environment()
    )

    if (
        environment
        not in VALID_ENVIRONMENTS
    ):
        raise RuntimeError(
            "APP_ENV must be one of: "
            "development, test, production."
        )

    access_token = (
        get_access_token()
    )

    if (
        environment
        == "production"
        and len(
            access_token
        )
        < 32
    ):
        raise RuntimeError(
            "VIZORA_ACCESS_TOKEN must "
            "be configured with at least "
            "32 characters in production."
        )

    if (
        is_rate_limiting_enabled()
    ):
        get_positive_int_setting(
            (
                "VIZORA_AI_"
                "RATE_LIMIT_PER_MINUTE"
            ),
            DEFAULT_AI_RATE_LIMIT,
        )

        get_positive_int_setting(
            (
                "VIZORA_SEARCH_"
                "RATE_LIMIT_PER_MINUTE"
            ),
            DEFAULT_SEARCH_RATE_LIMIT,
        )

        get_positive_int_setting(
            (
                "VIZORA_EMBEDDING_"
                "RATE_LIMIT_PER_MINUTE"
            ),
            DEFAULT_EMBEDDING_RATE_LIMIT,
        )

        get_positive_int_setting(
            (
                "VIZORA_UPLOAD_"
                "RATE_LIMIT_PER_MINUTE"
            ),
            DEFAULT_UPLOAD_RATE_LIMIT,
        )


def get_rate_limit_rule(
    request: Request,
) -> RateLimitRule | None:
    path = (
        request.url.path
    )

    method = (
        request.method.upper()
    )

    if (
        method == "POST"
        and path == "/api/images"
    ):
        return RateLimitRule(
            name="upload",

            limit=(
                get_positive_int_setting(
                    (
                        "VIZORA_UPLOAD_"
                        "RATE_LIMIT_PER_MINUTE"
                    ),
                    DEFAULT_UPLOAD_RATE_LIMIT,
                )
            ),
        )

    if path.startswith(
        "/api/ai",
    ):
        return RateLimitRule(
            name="ai",

            limit=(
                get_positive_int_setting(
                    (
                        "VIZORA_AI_"
                        "RATE_LIMIT_PER_MINUTE"
                    ),
                    DEFAULT_AI_RATE_LIMIT,
                )
            ),
        )

    if path.startswith(
        "/api/search",
    ):
        return RateLimitRule(
            name="search",

            limit=(
                get_positive_int_setting(
                    (
                        "VIZORA_SEARCH_"
                        "RATE_LIMIT_PER_MINUTE"
                    ),
                    DEFAULT_SEARCH_RATE_LIMIT,
                )
            ),
        )

    if path.startswith(
        "/api/embeddings",
    ):
        return RateLimitRule(
            name="embeddings",

            limit=(
                get_positive_int_setting(
                    (
                        "VIZORA_EMBEDDING_"
                        "RATE_LIMIT_PER_MINUTE"
                    ),
                    DEFAULT_EMBEDDING_RATE_LIMIT,
                )
            ),
        )

    return None


def get_client_identity(
    request: Request,
) -> str:
    if request.client:
        host = (
            request.client.host
        )

    else:
        host = "unknown"

    token = (
        request.headers.get(
            ACCESS_HEADER_NAME,
            "",
        )
    )

    if token:
        token_digest = (
            hashlib.sha256(
                token.encode(
                    "utf-8",
                )
            )
            .hexdigest()[
                :16
            ]
        )

    else:
        token_digest = (
            "anonymous"
        )

    return (
        f"{host}:{token_digest}"
    )


class AccessControlMiddleware(
    BaseHTTPMiddleware,
):
    async def dispatch(
        self,
        request: Request,
        call_next:
            RequestResponseEndpoint,
    ) -> Response:
        path = (
            request.url.path
        )

        if (
            request.method
            == "OPTIONS"
        ):
            return await call_next(
                request,
            )

        if not path.startswith(
            "/api",
        ):
            return await call_next(
                request,
            )

        if path in (
            PUBLIC_API_PATHS
        ):
            return await call_next(
                request,
            )

        if (
            is_request_authorized(
                request,
            )
        ):
            return await call_next(
                request,
            )

        return JSONResponse(
            status_code=401,

            content={
                "detail":
                    (
                        "VIZORA access "
                        "token required."
                    ),
            },
        )


class RateLimitMiddleware(
    BaseHTTPMiddleware,
):
    def __init__(
        self,
        app,
    ):
        super().__init__(
            app,
        )

        self._buckets: defaultdict[
            str,
            deque[float],
        ] = defaultdict(
            deque,
        )

        self._lock = (
            Lock()
        )


    async def dispatch(
        self,
        request: Request,
        call_next:
            RequestResponseEndpoint,
    ) -> Response:
        if (
            request.method
            == "OPTIONS"
        ):
            return await call_next(
                request,
            )

        if not (
            is_rate_limiting_enabled()
        ):
            return await call_next(
                request,
            )

        if not (
            is_request_authorized(
                request,
            )
        ):
            return await call_next(
                request,
            )

        rule = (
            get_rate_limit_rule(
                request,
            )
        )

        if rule is None:
            return await call_next(
                request,
            )

        identity = (
            get_client_identity(
                request,
            )
        )

        bucket_key = (
            f"{rule.name}:"
            f"{identity}"
        )

        now = (
            time.monotonic()
        )

        cutoff = (
            now
            - RATE_LIMIT_WINDOW_SECONDS
        )

        with self._lock:
            bucket = (
                self._buckets[
                    bucket_key
                ]
            )

            while (
                bucket
                and bucket[0]
                <= cutoff
            ):
                bucket.popleft()

            if (
                len(bucket)
                >= rule.limit
            ):
                retry_after = (
                    max(
                        1,

                        math.ceil(
                            (
                                RATE_LIMIT_WINDOW_SECONDS
                                -
                                (
                                    now
                                    - bucket[0]
                                )
                            )
                        ),
                    )
                )

                return JSONResponse(
                    status_code=429,

                    content={
                        "detail":
                            (
                                "Too many requests. "
                                "Try again shortly."
                            ),
                    },

                    headers={
                        "Retry-After":
                            str(
                                retry_after
                            ),
                    },
                )

            bucket.append(
                now,
            )

        return await call_next(
            request,
        )