from contextlib import contextmanager
from datetime import UTC, date, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app import ai_reports, bulletins, main
from app.ai_reports import AIReportUnavailableError
from app.auth import get_current_claims
from app.bulletins import Bulletin, Pick, get_or_create_todays_bulletin, pick_sector_for_date
from app.config import Settings
from app.entitlements import EntitlementLimitError

NOW = datetime(2026, 1, 1, tzinfo=UTC)


@pytest.fixture(autouse=True)
def patch_settings(monkeypatch):
    monkeypatch.setattr(
        ai_reports,
        "get_settings",
        lambda: Settings(anthropic_api_key="test-key", anthropic_model="claude-test"),
    )


@pytest.fixture
def anyio_backend():
    return "asyncio"


# --- sector rotation -------------------------------------------------------------


def test_pick_sector_for_date_is_deterministic():
    d = date(2026, 3, 15)

    assert pick_sector_for_date(d) == pick_sector_for_date(d)


def test_pick_sector_for_date_covers_all_sectors_over_a_year():
    picks = {pick_sector_for_date(date(2026, 1, 1) + timedelta(days=i)) for i in range(366)}

    assert picks == set(bulletins.SECTORS)


# --- get_or_create_todays_bulletin ------------------------------------------------


@pytest.mark.anyio
async def test_returns_existing_bulletin_without_scoring(monkeypatch):
    existing = Bulletin(
        bulletin_date=date.today(),
        sector="Technology",
        picks=[],
        content="Var olan bülten",
        created_at=NOW,
    )
    monkeypatch.setattr(bulletins, "_get_bulletin_by_date", lambda d: existing)

    def unexpected_call(sector):
        raise AssertionError("should not score a sector when today's bulletin already exists")

    monkeypatch.setattr(bulletins, "_score_sector_candidates", unexpected_call)

    result = await get_or_create_todays_bulletin()

    assert result is existing


@pytest.mark.anyio
async def test_raises_when_no_candidates_scored(monkeypatch):
    monkeypatch.setattr(bulletins, "_get_bulletin_by_date", lambda d: None)

    async def fake_score(sector):
        return []

    monkeypatch.setattr(bulletins, "_score_sector_candidates", fake_score)

    with pytest.raises(AIReportUnavailableError):
        await get_or_create_todays_bulletin()


@pytest.mark.anyio
async def test_generates_and_saves_new_bulletin(monkeypatch):
    monkeypatch.setattr(bulletins, "_get_bulletin_by_date", lambda d: None)

    picks = [Pick(symbol="AAPL", name="Apple Inc.", score=82, label="Al")]

    async def fake_score(sector):
        return picks

    saved = {}

    def fake_save(bulletin_date, sector, picks_arg, content):
        saved["bulletin_date"] = bulletin_date
        saved["sector"] = sector
        saved["picks"] = picks_arg
        saved["content"] = content
        return Bulletin(
            bulletin_date=bulletin_date,
            sector=sector,
            picks=picks_arg,
            content=content,
            created_at=NOW,
        )

    async def fake_call_anthropic(system_prompt, user_prompt, *, client=None):
        return "Bugünün bülteni."

    monkeypatch.setattr(bulletins, "_score_sector_candidates", fake_score)
    monkeypatch.setattr(bulletins, "_save_bulletin", fake_save)
    monkeypatch.setattr(bulletins, "call_anthropic", fake_call_anthropic)

    result = await get_or_create_todays_bulletin()

    assert result.content == "Bugünün bülteni."
    assert saved["sector"] == pick_sector_for_date(date.today())
    assert saved["picks"] == picks


# --- _save_bulletin idempotency ---------------------------------------------------


def test_save_bulletin_handles_concurrent_insert_race(monkeypatch):
    call_count = {"n": 0}

    class FakeCursor:
        def execute(self, query, params=None):
            pass

        def fetchone(self):
            call_count["n"] += 1
            if call_count["n"] == 1:
                return None  # ON CONFLICT DO NOTHING -> no row from the INSERT
            return {
                "bulletin_date": date(2026, 1, 1),
                "sector": "Technology",
                "picks": [],
                "content": "Başka bir istek tarafından oluşturuldu",
                "created_at": NOW,
            }

        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

    class FakeConnection:
        def cursor(self, row_factory=None):
            return FakeCursor()

        def commit(self):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

    @contextmanager
    def fake_get_connection():
        yield FakeConnection()

    monkeypatch.setattr(bulletins, "get_connection", fake_get_connection)

    result = bulletins._save_bulletin(date(2026, 1, 1), "Technology", [], "Benim içeriğim")

    assert result.content == "Başka bir istek tarafından oluşturuldu"


# --- endpoint ----------------------------------------------------------------------

client = TestClient(main.app)


@pytest.fixture(autouse=True)
def override_auth():
    main.app.dependency_overrides[get_current_claims] = lambda: {"sub": "user-1"}
    yield
    main.app.dependency_overrides.pop(get_current_claims, None)


def test_get_bulletins_endpoint_returns_403_for_free_user(monkeypatch):
    def blocked(user_id):
        raise EntitlementLimitError("AI analiz raporları yalnızca premium katmanda kullanılabilir.")

    monkeypatch.setattr(main, "enforce_ai_reports_access", blocked)

    response = client.get("/bulletins")

    assert response.status_code == 403


def test_get_bulletins_endpoint_requires_auth():
    main.app.dependency_overrides.pop(get_current_claims, None)

    response = client.get("/bulletins")

    assert response.status_code == 401


def test_get_bulletins_endpoint_returns_list_for_premium_user(monkeypatch):
    monkeypatch.setattr(main, "enforce_ai_reports_access", lambda user_id: None)

    async def fake_get_or_create():
        return None

    monkeypatch.setattr(main, "get_or_create_todays_bulletin", fake_get_or_create)
    monkeypatch.setattr(main, "list_bulletins", lambda: [])

    response = client.get("/bulletins")

    assert response.status_code == 200
    assert response.json() == {"bulletins": [], "warnings": []}
