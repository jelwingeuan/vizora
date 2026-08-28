from collections.abc import Generator
from pathlib import Path

from sqlalchemy import (
    create_engine,
    event,
    text,
)

from sqlalchemy.engine import Engine

from sqlalchemy.orm import (
    DeclarativeBase,
    Session,
    sessionmaker,
)


PROJECT_ROOT = (
    Path(__file__)
    .resolve()
    .parents[3]
)

DATABASE_PATH = (
    PROJECT_ROOT
    / "storage"
    / "vizora.db"
)

DATABASE_PATH.parent.mkdir(
    parents=True,
    exist_ok=True,
)

DATABASE_URL = (
    f"sqlite:///{DATABASE_PATH.as_posix()}"
)


engine = create_engine(
    DATABASE_URL,

    connect_args={
        "autocommit": False,
    },
)


@event.listens_for(
    Engine,
    "connect",
)
def enable_sqlite_foreign_keys(
    dbapi_connection,
    _,
) -> None:
    previous_autocommit = getattr(
        dbapi_connection,
        "autocommit",
        None,
    )

    try:
        if (
            previous_autocommit
            is not None
        ):
            dbapi_connection.autocommit = True

        cursor = (
            dbapi_connection.cursor()
        )

        try:
            cursor.execute(
                "PRAGMA foreign_keys=ON"
            )

        finally:
            cursor.close()

    finally:
        if (
            previous_autocommit
            is not None
        ):
            dbapi_connection.autocommit = (
                previous_autocommit
            )


SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    expire_on_commit=False,
)


class Base(
    DeclarativeBase,
):
    pass


def get_db() -> Generator[
    Session,
    None,
    None,
]:
    database = SessionLocal()

    try:
        yield database

    finally:
        database.close()


def initialize_database() -> None:
    import app.models  # noqa: F401

    Base.metadata.create_all(
        bind=engine,
    )

    with engine.connect() as connection:
        connection.execute(
            text(
                "SELECT 1"
            )
        )

        foreign_keys_enabled = (
            connection.exec_driver_sql(
                "PRAGMA foreign_keys"
            ).scalar()
        )

        if (
            foreign_keys_enabled
            != 1
        ):
            raise RuntimeError(
                "SQLite foreign-key "
                "enforcement is disabled."
            )