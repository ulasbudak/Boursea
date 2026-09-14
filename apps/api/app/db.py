from collections.abc import Iterator
from contextlib import contextmanager

import psycopg

from app.config import get_settings


@contextmanager
def get_connection() -> Iterator[psycopg.Connection]:
    settings = get_settings()
    conn = psycopg.connect(settings.supabase_db_url, connect_timeout=5)
    try:
        yield conn
    finally:
        conn.close()


def check_database_connection() -> bool:
    settings = get_settings()
    if not settings.supabase_db_url:
        return False
    try:
        with get_connection() as conn, conn.cursor() as cur:
            cur.execute("SELECT 1")
            return cur.fetchone() == (1,)
    except psycopg.Error:
        return False
