"""Import the static club and footballer catalog into an empty PostgreSQL DB."""

from __future__ import annotations

import argparse
import asyncio
import sqlite3
from pathlib import Path

import asyncpg
from sqlalchemy.engine import make_url

from backend.core.config import PROJECT_DIR, settings


CLUB_COLUMNS = (
    "id",
    "api_football_id",
    "name_en",
    "name_ru",
    "league",
)
FOOTBALLER_COLUMNS = (
    "id",
    "api_football_id",
    "name_en",
    "name_ru",
    "age",
    "position",
    "number",
    "photo",
    "club_id",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Import clubs and footballers from SQLite into an empty "
            "PostgreSQL catalog."
        ),
    )
    parser.add_argument(
        "--source",
        type=Path,
        default=PROJECT_DIR / "app.db",
        help="SQLite database containing clubs and footballers.",
    )
    return parser.parse_args()


def read_catalog(path: Path) -> tuple[list[tuple], list[tuple]]:
    if not path.is_file():
        raise FileNotFoundError(f"SQLite database not found: {path}")

    connection = sqlite3.connect(f"file:{path.resolve()}?mode=ro", uri=True)
    try:
        existing_tables = {
            row[0]
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            )
        }
        missing_tables = {"clubs", "footballers"} - existing_tables
        if missing_tables:
            raise RuntimeError(
                f"SQLite catalog is missing tables: {sorted(missing_tables)}"
            )

        clubs = connection.execute(
            f"SELECT {', '.join(CLUB_COLUMNS)} FROM clubs ORDER BY id"
        ).fetchall()
        footballers = connection.execute(
            f"SELECT {', '.join(FOOTBALLER_COLUMNS)} "
            "FROM footballers ORDER BY id"
        ).fetchall()
    finally:
        connection.close()

    if not clubs or not footballers:
        raise RuntimeError("SQLite catalog is empty")

    club_ids = {row[0] for row in clubs}
    missing_clubs = {
        row[-1]
        for row in footballers
        if row[-1] is not None and row[-1] not in club_ids
    }
    if missing_clubs:
        raise RuntimeError(
            "Footballers reference missing clubs: "
            f"{sorted(missing_clubs)[:10]}"
        )

    return clubs, footballers


def postgres_connect_kwargs() -> dict:
    url = make_url(settings.database_url)
    if not url.drivername.startswith("postgresql"):
        raise RuntimeError("DATABASE_URL must point to PostgreSQL")

    return {
        "host": url.host or "127.0.0.1",
        "port": url.port or 5432,
        "user": url.username,
        "password": url.password,
        "database": url.database,
    }


async def import_catalog(clubs: list[tuple], footballers: list[tuple]) -> None:
    connection = await asyncpg.connect(**postgres_connect_kwargs())
    try:
        async with connection.transaction():
            target_clubs = await connection.fetchval("SELECT COUNT(*) FROM clubs")
            target_footballers = await connection.fetchval(
                "SELECT COUNT(*) FROM footballers"
            )
            if target_clubs or target_footballers:
                raise RuntimeError(
                    "PostgreSQL catalog is not empty: "
                    f"clubs={target_clubs}, footballers={target_footballers}"
                )

            await connection.executemany(
                """
                INSERT INTO clubs (
                    id, api_football_id, name_en, name_ru, league
                ) VALUES ($1, $2, $3, $4, $5)
                """,
                clubs,
            )
            await connection.executemany(
                """
                INSERT INTO footballers (
                    id, api_football_id, name_en, name_ru, age,
                    position, number, photo, club_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                """,
                footballers,
            )

            await connection.execute(
                """
                SELECT setval(
                    pg_get_serial_sequence('clubs', 'id'),
                    (SELECT MAX(id) FROM clubs),
                    true
                )
                """
            )
            await connection.execute(
                """
                SELECT setval(
                    pg_get_serial_sequence('footballers', 'id'),
                    (SELECT MAX(id) FROM footballers),
                    true
                )
                """
            )

            imported_clubs = await connection.fetchval(
                "SELECT COUNT(*) FROM clubs"
            )
            imported_footballers = await connection.fetchval(
                "SELECT COUNT(*) FROM footballers"
            )
            if imported_clubs != len(clubs):
                raise RuntimeError(
                    f"Club count mismatch: {imported_clubs} != {len(clubs)}"
                )
            if imported_footballers != len(footballers):
                raise RuntimeError(
                    "Footballer count mismatch: "
                    f"{imported_footballers} != {len(footballers)}"
                )
    finally:
        await connection.close()


def main() -> None:
    args = parse_args()
    clubs, footballers = read_catalog(args.source)
    asyncio.run(import_catalog(clubs, footballers))
    print(f"Imported clubs: {len(clubs)}")
    print(f"Imported footballers: {len(footballers)}")


if __name__ == "__main__":
    main()
