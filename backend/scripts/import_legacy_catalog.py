import argparse
import sqlite3
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parents[2]
DEFAULT_TARGET = PROJECT_DIR / "app.db"
SYNTHETIC_API_ID_OFFSET = 1_000_000_000


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Import clubs and footballers from a legacy SQLite database.",
    )
    parser.add_argument(
        "--source",
        type=Path,
        required=True,
        help="Path to the legacy SQLite database.",
    )
    parser.add_argument(
        "--target",
        type=Path,
        default=DEFAULT_TARGET,
        help="Path to the target SQLite database.",
    )
    parser.add_argument(
        "--backup",
        type=Path,
        required=True,
        help="Path for a backup of the target database.",
    )
    return parser.parse_args()


def connect_read_only(path: Path) -> sqlite3.Connection:
    connection = sqlite3.connect(
        f"file:{path.as_posix()}?mode=ro",
        uri=True,
    )
    connection.row_factory = sqlite3.Row
    return connection


def require_tables(
    connection: sqlite3.Connection,
    expected_tables: set[str],
) -> None:
    existing_tables = {
        row[0]
        for row in connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        )
    }
    missing_tables = expected_tables - existing_tables
    if missing_tables:
        missing = ", ".join(sorted(missing_tables))
        raise RuntimeError(f"В базе отсутствуют таблицы: {missing}")


def normalized_club_api_id(source_id: int, api_football_id: int) -> int:
    if api_football_id > 0:
        return api_football_id
    return -(SYNTHETIC_API_ID_OFFSET + source_id)


def create_backup(
    target: sqlite3.Connection,
    backup_path: Path,
) -> None:
    if backup_path.exists():
        raise FileExistsError(
            f"Резервная копия уже существует: {backup_path}"
        )

    backup_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(backup_path) as backup:
        target.backup(backup)


def import_clubs(
    source: sqlite3.Connection,
    target: sqlite3.Connection,
) -> tuple[dict[int, int], int, int, int]:
    source_to_target: dict[int, int] = {}
    inserted = 0
    updated = 0
    synthetic_ids = 0

    clubs = source.execute(
        """
        SELECT id, api_football_id, name_en, name_ru, league
        FROM teams
        ORDER BY id
        """
    )

    for club in clubs:
        api_football_id = normalized_club_api_id(
            club["id"],
            club["api_football_id"],
        )
        if club["api_football_id"] <= 0:
            synthetic_ids += 1

        existing = target.execute(
            "SELECT id FROM clubs WHERE api_football_id = ?",
            (api_football_id,),
        ).fetchone()

        if existing is None:
            cursor = target.execute(
                """
                INSERT INTO clubs (
                    api_football_id,
                    name_en,
                    name_ru,
                    league
                )
                VALUES (?, ?, ?, ?)
                """,
                (
                    api_football_id,
                    club["name_en"],
                    club["name_ru"],
                    club["league"],
                ),
            )
            target_id = cursor.lastrowid
            inserted += 1
        else:
            target_id = existing["id"]
            target.execute(
                """
                UPDATE clubs
                SET name_en = ?, name_ru = ?, league = ?
                WHERE id = ?
                """,
                (
                    club["name_en"],
                    club["name_ru"],
                    club["league"],
                    target_id,
                ),
            )
            updated += 1

        source_to_target[club["id"]] = target_id

    return source_to_target, inserted, updated, synthetic_ids


def import_footballers(
    source: sqlite3.Connection,
    target: sqlite3.Connection,
    club_ids: dict[int, int],
) -> tuple[int, int]:
    inserted = 0
    updated = 0

    footballers = source.execute(
        """
        SELECT
            api_football_id,
            name_en,
            name_ru,
            age,
            position,
            number,
            photo,
            team_id
        FROM players
        ORDER BY id
        """
    )

    for footballer in footballers:
        club_id = club_ids.get(footballer["team_id"])
        if club_id is None:
            raise RuntimeError(
                "Не найден клуб для футболиста "
                f"api_football_id={footballer['api_football_id']}"
            )

        values = (
            footballer["name_en"],
            footballer["name_ru"],
            footballer["age"],
            footballer["position"],
            footballer["number"],
            footballer["photo"],
            club_id,
        )
        existing = target.execute(
            "SELECT id FROM footballers WHERE api_football_id = ?",
            (footballer["api_football_id"],),
        ).fetchone()

        if existing is None:
            target.execute(
                """
                INSERT INTO footballers (
                    api_football_id,
                    name_en,
                    name_ru,
                    age,
                    position,
                    number,
                    photo,
                    club_id
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (footballer["api_football_id"], *values),
            )
            inserted += 1
        else:
            target.execute(
                """
                UPDATE footballers
                SET
                    name_en = ?,
                    name_ru = ?,
                    age = ?,
                    position = ?,
                    number = ?,
                    photo = ?,
                    club_id = ?
                WHERE id = ?
                """,
                (*values, existing["id"]),
            )
            updated += 1

    return inserted, updated


def main() -> None:
    args = parse_args()
    source_path = args.source.resolve()
    target_path = args.target.resolve()
    backup_path = args.backup.resolve()

    if not source_path.is_file():
        raise FileNotFoundError(f"Исходная база не найдена: {source_path}")
    if not target_path.is_file():
        raise FileNotFoundError(f"Целевая база не найдена: {target_path}")
    if source_path == target_path:
        raise ValueError("Исходная и целевая базы не должны совпадать")

    source = connect_read_only(source_path)
    target = sqlite3.connect(target_path)
    target.row_factory = sqlite3.Row
    target.execute("PRAGMA foreign_keys = ON")

    try:
        require_tables(source, {"teams", "players"})
        require_tables(target, {"clubs", "footballers", "users"})
        create_backup(target, backup_path)

        target.execute("BEGIN IMMEDIATE")
        club_ids, clubs_inserted, clubs_updated, synthetic_ids = (
            import_clubs(source, target)
        )
        footballers_inserted, footballers_updated = import_footballers(
            source,
            target,
            club_ids,
        )

        foreign_key_errors = target.execute(
            "PRAGMA foreign_key_check"
        ).fetchall()
        if foreign_key_errors:
            raise RuntimeError(
                "После импорта обнаружены ошибки внешних ключей"
            )

        target.commit()
    except Exception:
        target.rollback()
        raise
    finally:
        source.close()
        target.close()

    print(f"Резервная копия: {backup_path}")
    print(
        "Клубы: "
        f"добавлено {clubs_inserted}, обновлено {clubs_updated}"
    )
    print(
        "Футболисты: "
        f"добавлено {footballers_inserted}, обновлено {footballers_updated}"
    )
    print(
        "Клубы с техническим API ID: "
        f"{synthetic_ids}"
    )


if __name__ == "__main__":
    main()
