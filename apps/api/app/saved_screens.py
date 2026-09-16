from datetime import datetime
from typing import Any

from psycopg.rows import dict_row
from psycopg.types.json import Json
from pydantic import BaseModel

from app.db import get_connection


class SavedScreenNotFoundError(Exception):
    """Raised when a saved screen does not exist or does not belong to the requesting user."""


class SavedScreen(BaseModel):
    id: str
    name: str
    criteria: dict[str, Any]
    created_at: datetime


def _row_to_saved_screen(row: dict) -> SavedScreen:
    return SavedScreen(
        id=str(row["id"]),
        name=row["name"],
        criteria=row["criteria"],
        created_at=row["created_at"],
    )


def list_saved_screens(user_id: str) -> list[SavedScreen]:
    with get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            "SELECT id, name, criteria, created_at FROM saved_screens "
            "WHERE user_id = %s ORDER BY created_at ASC",
            (user_id,),
        )
        return [_row_to_saved_screen(row) for row in cur.fetchall()]


def create_saved_screen(user_id: str, name: str, criteria: dict[str, Any]) -> SavedScreen:
    with get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            """
            INSERT INTO saved_screens (user_id, name, criteria)
            VALUES (%s, %s, %s)
            RETURNING id, name, criteria, created_at
            """,
            (user_id, name, Json(criteria)),
        )
        row = cur.fetchone()
        conn.commit()
    return _row_to_saved_screen(row)


def update_saved_screen(
    user_id: str,
    saved_screen_id: str,
    *,
    name: str | None = None,
    criteria: dict[str, Any] | None = None,
) -> SavedScreen:
    with get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            """
            UPDATE saved_screens
            SET name = COALESCE(%s, name), criteria = COALESCE(%s, criteria)
            WHERE id = %s AND user_id = %s
            RETURNING id, name, criteria, created_at
            """,
            (name, Json(criteria) if criteria is not None else None, saved_screen_id, user_id),
        )
        row = cur.fetchone()
        conn.commit()
    if row is None:
        raise SavedScreenNotFoundError(saved_screen_id)
    return _row_to_saved_screen(row)


def delete_saved_screen(user_id: str, saved_screen_id: str) -> None:
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "DELETE FROM saved_screens WHERE id = %s AND user_id = %s",
            (saved_screen_id, user_id),
        )
        deleted = cur.rowcount
        conn.commit()
    if deleted == 0:
        raise SavedScreenNotFoundError(saved_screen_id)
