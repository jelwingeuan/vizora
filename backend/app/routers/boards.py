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
    BoardNotFoundError,
    BoardStorageError,
    ImageNotFoundError,
    add_image_to_board,
    create_board,
    list_boards,
    remove_image_from_board,
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
    try:
        return list_boards(
            database,
        )

    except BoardStorageError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=str(error),
        ) from error


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


@router.post(
    "/{board_id}/images/{image_id}",
    response_model=BoardResponse,
)
def add_board_image(
    board_id: str,

    image_id: str,

    database: Session = Depends(
        get_db,
    ),
):
    try:
        return add_image_to_board(
            database=database,

            board_public_id=(
                board_id
            ),

            image_public_id=(
                image_id
            ),
        )

    except BoardNotFoundError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=str(error),
        ) from error

    except ImageNotFoundError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=str(error),
        ) from error

    except BoardStorageError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=str(error),
        ) from error


@router.delete(
    "/{board_id}/images/{image_id}",
    response_model=BoardResponse,
)
def remove_board_image(
    board_id: str,

    image_id: str,

    database: Session = Depends(
        get_db,
    ),
):
    try:
        return remove_image_from_board(
            database=database,

            board_public_id=(
                board_id
            ),

            image_public_id=(
                image_id
            ),
        )

    except BoardNotFoundError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=str(error),
        ) from error

    except ImageNotFoundError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=str(error),
        ) from error

    except BoardStorageError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=str(error),
        ) from error