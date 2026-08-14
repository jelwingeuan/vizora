from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db


router = APIRouter(
    prefix="/api",
    tags=["system"],
)


@router.get("/health")
def health_check(
    database: Session = Depends(get_db),
):
    database.execute(text("SELECT 1"))

    return {
        "status": "ok",
        "service": "vizora-api",
        "database": "connected",
    }