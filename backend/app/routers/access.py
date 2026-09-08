from fastapi import (
    APIRouter,
)

from pydantic import (
    BaseModel,
)

from app.core.security import (
    is_access_control_enabled,
)


router = APIRouter(
    prefix="/api/access",
    tags=["access"],
)


class AccessStatus(
    BaseModel,
):
    status: str

    protected: bool


@router.get(
    "",
    response_model=(
        AccessStatus
    ),
)
def check_access():
    return AccessStatus(
        status="ok",

        protected=(
            is_access_control_enabled()
        ),
    )