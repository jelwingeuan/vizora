from datetime import UTC, datetime

from sqlalchemy import (
    select,
)

from sqlalchemy.orm import (
    Session,
)

from app.models.board import (
    Board,
)

from app.models.board_image import (
    BoardImage,
)

from app.models.image import (
    Image,
)

from app.schemas.board import (
    BoardCreate,
    BoardResponse,
)


class BoardStorageError(
    RuntimeError,
):
    pass


class BoardNotFoundError(
    RuntimeError,
):
    pass


class ImageNotFoundError(
    RuntimeError,
):
    pass


def list_boards(
    database: Session,
) -> list[
    BoardResponse
]:
    try:
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
                database,
                record,
            )
            for record in records
        ]

    except Exception as error:
        raise BoardStorageError(
            "Unable to load boards."
        ) from error


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
                database,
                board,
            )
        )

    except Exception as error:
        database.rollback()

        raise BoardStorageError(
            "Unable to create board."
        ) from error


def add_image_to_board(
    database: Session,

    board_public_id: str,

    image_public_id: str,
) -> BoardResponse:
    board = find_board(
        database,
        board_public_id,
    )

    image = find_image(
        database,
        image_public_id,
    )

    membership_statement = (
        select(BoardImage)
        .where(
            BoardImage.board_id
            == board.id,

            BoardImage.image_id
            == image.id,
        )
    )

    existing_membership = (
        database.scalar(
            membership_statement,
        )
    )

    if (
        existing_membership
        is not None
    ):
        return (
            create_board_response(
                database,
                board,
            )
        )

    try:
        membership = BoardImage(
            board_id=board.id,
            image_id=image.id,
        )

        database.add(
            membership,
        )

        board.updated_at = (
            datetime.now(
                UTC,
            )
        )

        database.commit()

        database.refresh(
            board,
        )

        return (
            create_board_response(
                database,
                board,
            )
        )

    except Exception as error:
        database.rollback()

        raise BoardStorageError(
            "Unable to add image to board."
        ) from error


def remove_image_from_board(
    database: Session,

    board_public_id: str,

    image_public_id: str,
) -> BoardResponse:
    board = find_board(
        database,
        board_public_id,
    )

    image = find_image(
        database,
        image_public_id,
    )

    statement = (
        select(BoardImage)
        .where(
            BoardImage.board_id
            == board.id,

            BoardImage.image_id
            == image.id,
        )
    )

    membership = database.scalar(
        statement,
    )

    if membership is None:
        return (
            create_board_response(
                database,
                board,
            )
        )

    try:
        database.delete(
            membership,
        )

        board.updated_at = (
            datetime.now(
                UTC,
            )
        )

        database.commit()

        database.refresh(
            board,
        )

        return (
            create_board_response(
                database,
                board,
            )
        )

    except Exception as error:
        database.rollback()

        raise BoardStorageError(
            "Unable to remove image "
            "from board."
        ) from error


def find_board(
    database: Session,

    public_id: str,
) -> Board:
    statement = (
        select(Board)
        .where(
            Board.public_id
            == public_id,
        )
    )

    board = database.scalar(
        statement,
    )

    if board is None:
        raise BoardNotFoundError(
            "The board could not be found."
        )

    return board


def find_image(
    database: Session,

    public_id: str,
) -> Image:
    statement = (
        select(Image)
        .where(
            Image.public_id
            == public_id,
        )
    )

    image = database.scalar(
        statement,
    )

    if image is None:
        raise ImageNotFoundError(
            "The image could not be found."
        )

    return image


def get_board_image_ids(
    database: Session,

    board_id: int,
) -> list[str]:
    statement = (
        select(
            Image.public_id,
        )
        .join(
            BoardImage,

            BoardImage.image_id
            == Image.id,
        )
        .where(
            BoardImage.board_id
            == board_id,
        )
        .order_by(
            BoardImage.created_at.desc(),
            BoardImage.id.desc(),
        )
    )

    return list(
        database.scalars(
            statement,
        ).all()
    )


def create_board_response(
    database: Session,

    board: Board,
) -> BoardResponse:
    return BoardResponse(
        id=board.public_id,

        name=board.name,

        description=(
            board.description
        ),

        image_ids=(
            get_board_image_ids(
                database,
                board.id,
            )
        ),

        created_at=(
            board.created_at
        ),

        updated_at=(
            board.updated_at
        ),
    )