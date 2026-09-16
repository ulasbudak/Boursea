from contextlib import contextmanager

import httpx
import pytest
from fastapi.testclient import TestClient

from app import main, notifications
from app.auth import get_current_claims
from app.config import Settings
from app.notifications import NotificationSettings


class FakeCursor:
    def __init__(self, responses: list[dict]):
        self._responses = responses
        self._index = -1

    def execute(self, query, params=None):
        self._index += 1

    def fetchone(self):
        return self._responses[self._index].get("fetchone")

    def fetchall(self):
        return self._responses[self._index].get("fetchall", [])

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class FakeConnection:
    def __init__(self, responses: list[dict]):
        self._responses = responses

    def cursor(self, row_factory=None):
        return FakeCursor(self._responses)

    def commit(self):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def fake_get_connection(responses: list[dict]):
    @contextmanager
    def _get_connection():
        yield FakeConnection(responses)

    return _get_connection


# --- data layer -------------------------------------------------------------


def test_get_settings_for_user_returns_defaults_when_no_row(monkeypatch):
    monkeypatch.setattr(
        notifications, "get_connection", fake_get_connection([{"fetchone": None}])
    )

    result = notifications.get_settings_for_user("user-1")

    assert result == NotificationSettings(
        expo_push_token=None, push_enabled=True, email_enabled=True
    )


def test_get_settings_for_user_returns_stored_row(monkeypatch):
    monkeypatch.setattr(
        notifications,
        "get_connection",
        fake_get_connection(
            [
                {
                    "fetchone": {
                        "expo_push_token": "ExponentPushToken[abc]",
                        "push_enabled": False,
                        "email_enabled": True,
                    }
                }
            ]
        ),
    )

    result = notifications.get_settings_for_user("user-1")

    assert result.expo_push_token == "ExponentPushToken[abc]"
    assert result.push_enabled is False


def test_upsert_settings_for_user_merges_partial_update(monkeypatch):
    monkeypatch.setattr(
        notifications,
        "get_connection",
        fake_get_connection(
            [
                {
                    "fetchone": {
                        "expo_push_token": "old-token",
                        "push_enabled": True,
                        "email_enabled": True,
                    }
                },
                {},
            ]
        ),
    )

    result = notifications.upsert_settings_for_user("user-1", email_enabled=False)

    assert result.expo_push_token == "old-token"
    assert result.push_enabled is True
    assert result.email_enabled is False


# --- send functions -----------------------------------------------------------


@pytest.mark.anyio
async def test_send_expo_push_returns_true_on_success():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url == notifications.EXPO_PUSH_URL
        return httpx.Response(200, json={"data": {"status": "ok"}})

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        result = await notifications.send_expo_push(
            "ExponentPushToken[abc]", "Title", "Body", client=client
        )

    assert result is True


@pytest.mark.anyio
async def test_send_expo_push_returns_false_on_http_error():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(400)

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        result = await notifications.send_expo_push("bad-token", "Title", "Body", client=client)

    assert result is False


@pytest.mark.anyio
async def test_send_email_returns_false_without_api_key(monkeypatch):
    monkeypatch.setattr(notifications, "get_settings", lambda: Settings(resend_api_key=""))

    result = await notifications.send_email("user@example.com", "Subject", "Body")

    assert result is False


@pytest.mark.anyio
async def test_send_email_returns_true_on_success(monkeypatch):
    monkeypatch.setattr(notifications, "get_settings", lambda: Settings(resend_api_key="test-key"))

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["Authorization"] == "Bearer test-key"
        return httpx.Response(200, json={"id": "email-1"})

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        result = await notifications.send_email(
            "user@example.com", "Subject", "Body", client=client
        )

    assert result is True


# --- notify_trigger -----------------------------------------------------------


@pytest.mark.anyio
async def test_notify_trigger_sends_push_when_enabled_with_token(monkeypatch):
    monkeypatch.setattr(
        notifications,
        "get_settings_for_user",
        lambda user_id: NotificationSettings(
            expo_push_token="tok", push_enabled=True, email_enabled=False
        ),
    )
    sent = {}

    async def fake_send_push(token, title, body):
        sent["push"] = (token, title, body)
        return True

    monkeypatch.setattr(notifications, "send_expo_push", fake_send_push)

    await notifications.notify_trigger("user-1", "user@example.com", "Title", "Body")

    assert sent["push"] == ("tok", "Title", "Body")


@pytest.mark.anyio
async def test_notify_trigger_skips_push_without_token(monkeypatch):
    monkeypatch.setattr(
        notifications,
        "get_settings_for_user",
        lambda user_id: NotificationSettings(
            expo_push_token=None, push_enabled=True, email_enabled=False
        ),
    )

    async def unexpected_push(token, title, body):
        raise AssertionError("should not attempt push without a token")

    monkeypatch.setattr(notifications, "send_expo_push", unexpected_push)

    await notifications.notify_trigger("user-1", None, "Title", "Body")


@pytest.mark.anyio
async def test_notify_trigger_never_raises_on_lookup_failure(monkeypatch):
    def failing_lookup(user_id):
        raise RuntimeError("db down")

    monkeypatch.setattr(notifications, "get_settings_for_user", failing_lookup)

    await notifications.notify_trigger("user-1", "user@example.com", "Title", "Body")


@pytest.fixture
def anyio_backend():
    return "asyncio"


# --- /notification-settings endpoints -----------------------------------------

client = TestClient(main.app)


@pytest.fixture(autouse=True)
def override_auth():
    main.app.dependency_overrides[get_current_claims] = lambda: {"sub": "user-1"}
    yield
    main.app.dependency_overrides.pop(get_current_claims, None)


def test_get_notification_settings_endpoint(monkeypatch):
    monkeypatch.setattr(
        main,
        "get_notification_settings_for_user",
        lambda user_id: NotificationSettings(push_enabled=True, email_enabled=True),
    )

    response = client.get("/notification-settings")

    assert response.status_code == 200
    assert response.json() == {
        "expo_push_token": None,
        "push_enabled": True,
        "email_enabled": True,
    }


def test_put_notification_settings_endpoint(monkeypatch):
    def fake_upsert(user_id, **kwargs):
        assert user_id == "user-1"
        assert kwargs["email_enabled"] is False
        return NotificationSettings(push_enabled=True, email_enabled=False)

    monkeypatch.setattr(main, "upsert_notification_settings", fake_upsert)

    response = client.put("/notification-settings", json={"email_enabled": False})

    assert response.status_code == 200
    assert response.json()["email_enabled"] is False
