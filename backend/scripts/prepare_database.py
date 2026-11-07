"""Safely baseline databases previously created with metadata.create_all()."""

from __future__ import annotations

import asyncio
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect
from sqlalchemy.engine import Connection, make_url

import backend.modules.model_registry  # Registers every ORM model.
from backend.core.config import PROJECT_DIR, settings
from backend.database import Base, engine


GAMEPLAY_REVISION = "a4d7e9c2f105"
MERGED_OAUTH_REVISION = "cfa21eae9cee"


def _inspect_schema(connection: Connection) -> tuple[bool, str | None]:
    inspector = inspect(connection)
    actual_tables = set(inspector.get_table_names())
    expected_tables = {
        table.name: {column.name for column in table.columns}
        for table in Base.metadata.sorted_tables
    }

    has_version = "alembic_version" in actual_tables
    application_tables = actual_tables.intersection(expected_tables)
    if has_version or not application_tables:
        return has_version, None

    missing_tables = set(expected_tables).difference(actual_tables)
    actual_columns = {
        table_name: {
            column["name"]
            for column in inspector.get_columns(table_name)
        }
        for table_name in expected_tables
        if table_name in actual_tables
    }
    missing_columns = {
        table_name: expected_columns.difference(actual_columns[table_name])
        for table_name, expected_columns in expected_tables.items()
        if table_name in actual_tables
    }
    missing_columns = {
        table_name: columns
        for table_name, columns in missing_columns.items()
        if columns
    }

    if missing_tables:
        raise RuntimeError(
            "Database has an unversioned partial schema; refusing to stamp. "
            f"Missing tables: {sorted(missing_tables)}; "
            f"missing columns: {missing_columns}"
        )

    oauth_columns = {"google_id", "telegram_id", "provider", "avatar_url"}
    users_extra_columns = actual_columns["users"].difference(
        expected_tables["users"]
    )
    if (
        missing_columns == {"users": oauth_columns}
        and not users_extra_columns
    ):
        return False, GAMEPLAY_REVISION
    if missing_columns:
        raise RuntimeError(
            "Database has an unversioned partial schema; refusing to stamp. "
            f"Missing columns: {missing_columns}"
        )

    if users_extra_columns == {"country_code"}:
        return False, MERGED_OAUTH_REVISION
    if users_extra_columns:
        raise RuntimeError(
            "Database has unexpected legacy users columns; refusing to stamp: "
            f"{sorted(users_extra_columns)}"
        )

    return False, "head"


async def _inspect_async_schema() -> tuple[bool, str | None]:
    try:
        async with engine.connect() as connection:
            return await connection.run_sync(_inspect_schema)
    finally:
        await engine.dispose()


def _schema_state() -> tuple[bool, str | None]:
    driver_name = make_url(settings.database_url).drivername
    if driver_name.endswith(("+asyncpg", "+aiosqlite")):
        return asyncio.run(_inspect_async_schema())

    sync_engine = create_engine(settings.database_url)
    try:
        with sync_engine.connect() as connection:
            return _inspect_schema(connection)
    finally:
        sync_engine.dispose()


def main() -> None:
    has_version, stamp_revision = _schema_state()
    if has_version:
        print("Database already has Alembic version metadata.")
        return
    if stamp_revision is None:
        print("Database is empty; Alembic will create it.")
        return

    config = Config(str(Path(PROJECT_DIR) / "alembic.ini"))
    command.stamp(config, stamp_revision)
    print(f"Compatible legacy schema stamped at {stamp_revision}.")


if __name__ == "__main__":
    main()
