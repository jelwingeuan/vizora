import os

from collections.abc import (
    Generator,
)

from pathlib import Path

from dotenv import (
    load_dotenv,
)

from sqlalchemy import (
    create_engine,
    event,
    inspect,
    text,
)

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


BACKEND_ROOT = (
    Path(__file__)
    .resolve()
    .parents[2]
)


load_dotenv(
    BACKEND_ROOT
    / ".env",
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


DEFAULT_DATABASE_URL = (
    "sqlite:///"
    f"{DATABASE_PATH.as_posix()}"
)


configured_database_url = (
    os.getenv(
        "DATABASE_URL",
        "",
    )
    .strip()
)


DATABASE_URL = (
    configured_database_url
    or DEFAULT_DATABASE_URL
)


engine_options = {}


if DATABASE_URL.startswith(
    "sqlite",
):
    engine_options[
        "connect_args"
    ] = {
        "check_same_thread":
            False,
    }


engine = create_engine(
    DATABASE_URL,
    **engine_options,
)


def enable_sqlite_foreign_keys(
    dbapi_connection,
    _,
) -> None:
    cursor = (
        dbapi_connection.cursor()
    )

    try:
        cursor.execute(
            "PRAGMA foreign_keys=ON"
        )

    finally:
        cursor.close()


if (
    engine.url.get_backend_name()
    == "sqlite"
):
    event.listen(
        engine,
        "connect",
        enable_sqlite_foreign_keys,
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
    database = (
        SessionLocal()
    )

    try:
        yield database

    finally:
        database.close()


def initialize_database() -> None:
    with engine.connect() as connection:
        connection.execute(
            text(
                "SELECT 1"
            )
        )


        if (
            connection.dialect.name
            == "sqlite"
        ):
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


        inspector = (
            inspect(
                connection,
            )
        )


        if not inspector.has_table(
            "alembic_version",
        ):
            raise RuntimeError(
                "Database migrations have "
                "not been initialized. "
                "Run `alembic upgrade head` "
                "from the backend directory."
            )


        migration_version = (
            connection.execute(
                text(
                    "SELECT version_num "
                    "FROM alembic_version "
                    "LIMIT 1"
                )
            ).scalar()
        )


        if not migration_version:
            raise RuntimeError(
                "The database does not have "
                "an active Alembic revision. "
                "Run `alembic upgrade head`."
            )