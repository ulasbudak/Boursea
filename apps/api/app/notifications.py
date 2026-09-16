import httpx
from psycopg.rows import dict_row
from pydantic import BaseModel

from app.config import get_settings
from app.db import get_connection

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
RESEND_URL = "https://api.resend.com/emails"
NOTIFICATION_TIMEOUT_SECONDS = 5.0


class NotificationSettings(BaseModel):
    expo_push_token: str | None = None
    push_enabled: bool = True
    email_enabled: bool = True


def get_settings_for_user(user_id: str) -> NotificationSettings:
    with get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            "SELECT expo_push_token, push_enabled, email_enabled "
            "FROM user_notification_settings WHERE user_id = %s",
            (user_id,),
        )
        row = cur.fetchone()
    if row is None:
        return NotificationSettings()
    return NotificationSettings(**row)


def upsert_settings_for_user(
    user_id: str,
    *,
    expo_push_token: str | None = None,
    push_enabled: bool | None = None,
    email_enabled: bool | None = None,
) -> NotificationSettings:
    current = get_settings_for_user(user_id)
    merged = NotificationSettings(
        expo_push_token=expo_push_token if expo_push_token is not None else current.expo_push_token,
        push_enabled=push_enabled if push_enabled is not None else current.push_enabled,
        email_enabled=email_enabled if email_enabled is not None else current.email_enabled,
    )
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO user_notification_settings
                (user_id, expo_push_token, push_enabled, email_enabled, updated_at)
            VALUES (%s, %s, %s, %s, now())
            ON CONFLICT (user_id) DO UPDATE SET
                expo_push_token = EXCLUDED.expo_push_token,
                push_enabled = EXCLUDED.push_enabled,
                email_enabled = EXCLUDED.email_enabled,
                updated_at = now()
            """,
            (user_id, merged.expo_push_token, merged.push_enabled, merged.email_enabled),
        )
        conn.commit()
    return merged


async def send_expo_push(
    token: str, title: str, body: str, *, client: httpx.AsyncClient | None = None
) -> bool:
    owns_client = client is None
    http_client = client or httpx.AsyncClient(timeout=NOTIFICATION_TIMEOUT_SECONDS)
    try:
        response = await http_client.post(
            EXPO_PUSH_URL,
            json={"to": token, "title": title, "body": body},
            headers={"Content-Type": "application/json"},
        )
        return response.status_code == 200
    except httpx.HTTPError:
        return False
    finally:
        if owns_client:
            await http_client.aclose()


async def send_email(
    to: str, subject: str, body: str, *, client: httpx.AsyncClient | None = None
) -> bool:
    settings = get_settings()
    if not settings.resend_api_key:
        return False

    owns_client = client is None
    http_client = client or httpx.AsyncClient(timeout=NOTIFICATION_TIMEOUT_SECONDS)
    try:
        response = await http_client.post(
            RESEND_URL,
            json={
                "from": settings.notification_from_email,
                "to": [to],
                "subject": subject,
                "text": body,
            },
            headers={
                "Authorization": f"Bearer {settings.resend_api_key}",
                "Content-Type": "application/json",
            },
        )
        return response.status_code < 300
    except httpx.HTTPError:
        return False
    finally:
        if owns_client:
            await http_client.aclose()


async def notify_trigger(user_id: str, email: str | None, title: str, body: str) -> None:
    """Best-effort notification dispatch for a just-triggered alert.

    Never raises: a notification-delivery failure must not break the /alerts or
    /signal-alerts response that triggered it (the alert is already persisted as
    triggered regardless of whether we manage to tell the user about it).
    """
    try:
        settings = get_settings_for_user(user_id)
    except Exception:
        return

    if settings.push_enabled and settings.expo_push_token:
        try:
            await send_expo_push(settings.expo_push_token, title, body)
        except Exception:
            pass

    if settings.email_enabled and email:
        try:
            await send_email(email, title, body)
        except Exception:
            pass
