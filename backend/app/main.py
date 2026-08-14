from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import initialize_database
from app.routers import health


@asynccontextmanager
async def lifespan(_: FastAPI):
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


allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(health.router)


@app.get("/", tags=["system"])
async def root():
    return {
        "name": "VIZORA API",
        "status": "running",
        "version": "0.1.0",
    }