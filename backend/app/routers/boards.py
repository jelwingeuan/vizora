from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from sqlalchemy.orm import (
    Session,
)

from app.core.database import (
    get_db,
)

from app.schemas.board import (
    BoardCreate,
    BoardResponse,
)

from app.services.board_service import (
    BoardStorageError,
    create_board,
    list_boards,
)


router = APIRouter(
    prefix="/api/boards",
    tags=["boards"],
)


@router.get(
    "",
    response_model=list[
        BoardResponse
    ],
)
def get_boards(
    database: Session = Depends(
        get_db,
    ),
):
    return list_boards(
        database,
    )


@router.post(
    "",
    response_model=BoardResponse,
    status_code=(
        status.HTTP_201_CREATED
    ),
)
def create_new_board(
    payload: BoardCreate,

    database: Session = Depends(
        get_db,
    ),
):
    try:
        return create_board(
            database,
            payload,
        )

    except BoardStorageError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=str(error),
        ) from error