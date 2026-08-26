from sqlalchemy import (
    select,
)

from sqlalchemy.orm import (
    Session,
)

from app.models.board import (
    Board,
)

from app.schemas.board import (
    BoardCreate,
    BoardResponse,
)


class BoardStorageError(
    RuntimeError,
):
    pass


def list_boards(
    database: Session,
) -> list[
    BoardResponse
]:
    statement = (
        select(Board)
        .order_by(
            Board.created_at.desc(),
            Board.id.desc(),
        )
    )

    records = list(
        database.scalars(
            statement,
        ).all()
    )

    return [
        create_board_response(
            record,
        )
        for record in records
    ]


def create_board(
    database: Session,
    payload: BoardCreate,
) -> BoardResponse:
    try:
        board = Board(
            name=payload.name,
            description=(
                payload.description
            ),
        )

        database.add(
            board,
        )

        database.commit()

        database.refresh(
            board,
        )

        return (
            create_board_response(
                board,
            )
        )

    except Exception as error:
        database.rollback()

        raise BoardStorageError(
            "Unable to create board."
        ) from error


def create_board_response(
    board: Board,
) -> BoardResponse:
    return BoardResponse(
        id=board.public_id,

        name=board.name,

        description=(
            board.description
        ),

        created_at=(
            board.created_at
        ),

        updated_at=(
            board.updated_at
        ),
    )