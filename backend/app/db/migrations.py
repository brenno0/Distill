import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

MIGRATIONS_DIR = Path(__file__).parent.parent.parent / "migrations"


def _get_conn(database_url: str):
    import psycopg2
    return psycopg2.connect(database_url)


def _ensure_migrations_table(cur) -> None:
    cur.execute("""
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version     TEXT        PRIMARY KEY,
            applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)


def _applied_versions(cur) -> set[str]:
    cur.execute("SELECT version FROM schema_migrations ORDER BY version")
    return {row[0] for row in cur.fetchall()}


def _migration_files() -> list[Path]:
    if not MIGRATIONS_DIR.exists():
        return []
    files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    return files


def run_migrations(database_url: str) -> None:
    """Apply all pending SQL migrations. Safe to call on every startup."""
    if not database_url:
        logger.warning("DATABASE_URL not set — skipping migrations")
        return

    conn = _get_conn(database_url)
    try:
        conn.autocommit = False
        with conn.cursor() as cur:
            _ensure_migrations_table(cur)
            conn.commit()

            applied = _applied_versions(cur)
            pending = [f for f in _migration_files() if f.stem not in applied]

            if not pending:
                logger.info("Database schema is up to date")
                return

            for path in pending:
                logger.info("Applying migration: %s", path.name)
                sql = path.read_text(encoding="utf-8")
                cur.execute(sql)
                cur.execute(
                    "INSERT INTO schema_migrations (version) VALUES (%s)",
                    (path.stem,),
                )
                conn.commit()
                logger.info("Applied: %s", path.name)

    except Exception:
        conn.rollback()
        logger.exception("Migration failed — rolled back")
        raise
    finally:
        conn.close()
