import os

from contextlib import (
    asynccontextmanager,
)

from fastapi import (
    FastAPI,
)

from fastapi.middleware.cors import (
    CORSMiddleware,
)

from fastapi.staticfiles import (
    StaticFiles,
)

from app.core.database import (
    initialize_database,
)

from app.core.security import (
    AccessControlMiddleware,
    RateLimitMiddleware,
    validate_security_configuration,
)

from app.core.storage import (
    UPLOADS_DIR,
)

from app.routers import (
    access,
    ai,
    boards,
    embeddings,
    health,
    images,
    search,
)


DEFAULT_ALLOWED_ORIGINS = (
    "http://localhost:5173",
    "http://127.0.0.1:5173",
)


def get_allowed_origins() -> list[str]:
    raw_origins = (
        os.getenv(
            "CORS_ORIGINS",
            "",
        )
        .strip()
    )

    if not raw_origins:
        return list(
            DEFAULT_ALLOWED_ORIGINS
        )

    origins = [
        origin
        .strip()
        .rstrip("/")

        for origin
        in raw_origins.split(",")

        if origin.strip()
    ]

    if not origins:
        return list(
            DEFAULT_ALLOWED_ORIGINS
        )

    return list(
        dict.fromkeys(
            origins,
        )
    )


@asynccontextmanager
async def lifespan(
    _: FastAPI,
):
    validate_security_configuration()

    initialize_database()

    yield


app = FastAPI(
    title="VIZORA API",

    description=(
        "Backend API for the VIZORA visual "
        "intelligence workspace."
    ),

    version="0.1.0",

    lifespan=lifespan,
)


app.add_middleware(
    RateLimitMiddleware,
)


app.add_middleware(
    AccessControlMiddleware,
)


app.add_middleware(
    CORSMiddleware,

    allow_origins=(
        get_allowed_origins()
    ),

    allow_credentials=False,

    allow_methods=[
        "*",
    ],

    allow_headers=[
        "*",
    ],
)


app.mount(
    "/uploads",

    StaticFiles(
        directory=str(
            UPLOADS_DIR,
        ),
    ),

    name="uploads",
)


app.include_router(
    health.router,
)

app.include_router(
    access.router,
)

app.include_router(
    ai.router,
)

app.include_router(
    search.router,
)

app.include_router(
    embeddings.router,
)

app.include_router(
    images.router,
)

app.include_router(
    boards.router,
)


@app.get(
    "/",
    tags=[
        "system",
    ],
)
async def root():
    return {
        "name":
            "VIZORA API",

        "status":
            "running",

        "version":
            "0.1.0",
    }