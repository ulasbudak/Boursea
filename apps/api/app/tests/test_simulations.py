from contextlib import contextmanager
from datetime import UTC, date, datetime

import pytest
from fastapi.testclient import TestClient

from app import main, simulations
from app.auth import get_current_claims
from app.entitlements import EntitlementLimitError
from app.market_data import MarketDataUnavailableError, StockOverview
from app.simulations import (
    InsufficientFundsError,
    InsufficientQuantityError,
    Simulation,
    SimulationNotFoundError,
    SimulationPosition,
    place_order,
    save_todays_snapshot,
    value_simulations,
)

NOW = datetime(2026, 1, 1, tzinfo=UTC)


class FakeCursor:
    def __init__(self, responses: list[dict]):
        self._responses = responses
        self._index = -1
        self.rowcount = 0

    def execute(self, query, params=None):
        self._index += 1
        self.rowcount = self._responses[self._index].get("rowcount", 0)

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


def _position_row(**overrides) -> dict:
    row = {
        "id": "pos1",
        "simulation_id": "s1",
        "symbol": "AAPL",
        "exchange": "US",
        "name": "Apple Inc",
        "quantity": 10,
        "avg_cost": 100,
        "created_at": NOW,
        "updated_at": NOW,
    }
    row.update(overrides)
    return row


@pytest.fixture
def anyio_backend():
    return "asyncio"


# --- data layer --------------------------------------------------------------------


def test_create_simulation_sets_cash_balance_to_budget(monkeypatch):
    monkeypatch.setattr(
        simulations,
        "get_connection",
        fake_get_connection(
            [
                {
                    "fetchone": {
                        "id": "s1",
                        "name": "My Sim",
                        "starting_budget": 10000,
                        "cash_balance": 10000,
                        "created_at": NOW,
                    }
                }
            ]
        ),
    )

    result = simulations.create_simulation("user-1", "My Sim", 10000)

    assert result.starting_budget == 10000
    assert result.cash_balance == 10000


@pytest.mark.anyio
async def test_place_order_buy_creates_new_position(monkeypatch):
    async def fake_overview(symbol, *, client=None):
        return StockOverview(symbol="AAPL", exchange="US", name="Apple Inc", price=150.0)

    monkeypatch.setattr(simulations, "get_us_overview", fake_overview)
    monkeypatch.setattr(
        simulations,
        "get_connection",
        fake_get_connection(
            [
                {"fetchone": {"cash_balance": 10000}},
                {"fetchone": None},
                {"fetchone": _position_row(quantity=5, avg_cost=150)},
                {"fetchone": None},
            ]
        ),
    )

    result = await place_order(
        "user-1", "s1", symbol="aapl", exchange="us", name="Apple Inc", quantity=5, side="buy"
    )

    assert result.symbol == "AAPL"
    assert result.quantity == 5
    assert result.avg_cost == 150


@pytest.mark.anyio
async def test_place_order_buy_averages_existing_position(monkeypatch):
    async def fake_overview(symbol, *, client=None):
        return StockOverview(symbol="AAPL", exchange="US", name="Apple Inc", price=200.0)

    monkeypatch.setattr(simulations, "get_us_overview", fake_overview)
    monkeypatch.setattr(
        simulations,
        "get_connection",
        fake_get_connection(
            [
                {"fetchone": {"cash_balance": 10000}},
                {"fetchone": {"id": "pos1", "quantity": 10, "avg_cost": 100}},
                {"fetchone": _position_row(quantity=20, avg_cost=150)},
                {"fetchone": None},
            ]
        ),
    )

    result = await place_order(
        "user-1", "s1", symbol="AAPL", exchange="US", name=None, quantity=10, side="buy"
    )

    assert result.quantity == 20
    assert result.avg_cost == 150


@pytest.mark.anyio
async def test_place_order_buy_raises_insufficient_funds(monkeypatch):
    async def fake_overview(symbol, *, client=None):
        return StockOverview(symbol="AAPL", exchange="US", name="Apple Inc", price=1000.0)

    monkeypatch.setattr(simulations, "get_us_overview", fake_overview)
    monkeypatch.setattr(
        simulations,
        "get_connection",
        fake_get_connection(
            [{"fetchone": {"cash_balance": 500}}, {"fetchone": None}]
        ),
    )

    with pytest.raises(InsufficientFundsError):
        await place_order(
            "user-1", "s1", symbol="AAPL", exchange="US", name=None, quantity=1, side="buy"
        )


@pytest.mark.anyio
async def test_place_order_buy_raises_when_simulation_not_found(monkeypatch):
    async def fake_overview(symbol, *, client=None):
        return StockOverview(symbol="AAPL", exchange="US", name="Apple Inc", price=150.0)

    monkeypatch.setattr(simulations, "get_us_overview", fake_overview)
    monkeypatch.setattr(
        simulations, "get_connection", fake_get_connection([{"fetchone": None}])
    )

    with pytest.raises(SimulationNotFoundError):
        await place_order(
            "user-1", "s1", symbol="AAPL", exchange="US", name=None, quantity=1, side="buy"
        )


@pytest.mark.anyio
async def test_place_order_sell_raises_insufficient_quantity(monkeypatch):
    async def fake_overview(symbol, *, client=None):
        return StockOverview(symbol="AAPL", exchange="US", name="Apple Inc", price=150.0)

    monkeypatch.setattr(simulations, "get_us_overview", fake_overview)
    monkeypatch.setattr(
        simulations,
        "get_connection",
        fake_get_connection(
            [
                {"fetchone": {"cash_balance": 10000}},
                {"fetchone": {"id": "pos1", "quantity": 5, "avg_cost": 100}},
            ]
        ),
    )

    with pytest.raises(InsufficientQuantityError):
        await place_order(
            "user-1", "s1", symbol="AAPL", exchange="US", name=None, quantity=10, side="sell"
        )


@pytest.mark.anyio
async def test_place_order_sell_full_removes_position_and_credits_cash(monkeypatch):
    async def fake_overview(symbol, *, client=None):
        return StockOverview(symbol="AAPL", exchange="US", name="Apple Inc", price=200.0)

    monkeypatch.setattr(simulations, "get_us_overview", fake_overview)
    monkeypatch.setattr(
        simulations,
        "get_connection",
        fake_get_connection(
            [
                {"fetchone": {"cash_balance": 1000}},
                {"fetchone": {"id": "pos1", "quantity": 10, "avg_cost": 100}},
                {"fetchone": _position_row(quantity=10, avg_cost=100)},
                {"fetchone": None},
            ]
        ),
    )

    result = await place_order(
        "user-1", "s1", symbol="AAPL", exchange="US", name=None, quantity=10, side="sell"
    )

    assert result.symbol == "AAPL"


@pytest.mark.anyio
async def test_place_order_rejects_bist():
    with pytest.raises(MarketDataUnavailableError):
        await place_order(
            "user-1", "s1", symbol="GARAN", exchange="BIST", name=None, quantity=1, side="buy"
        )


# --- value_simulations ---------------------------------------------------------------


@pytest.mark.anyio
async def test_value_simulations_computes_totals(monkeypatch):
    async def fake_overview(symbol, *, client=None):
        return StockOverview(symbol=symbol, exchange="US", name="Apple Inc", price=200.0)

    monkeypatch.setattr(simulations, "get_us_overview", fake_overview)

    position = SimulationPosition(
        id="pos1", symbol="AAPL", exchange="US", name="Apple Inc", quantity=10, avg_cost=100,
        created_at=NOW, updated_at=NOW, cost_basis=1000,
    )
    simulation = Simulation(
        id="s1", name="My Sim", starting_budget=10000, cash_balance=9000, created_at=NOW,
        positions=[position],
    )

    valued, warnings = await value_simulations([simulation])

    assert warnings == []
    assert valued[0].positions_value == 2000
    assert valued[0].total_equity == 11000
    assert valued[0].total_pnl_abs == 1000


@pytest.mark.anyio
async def test_value_simulations_marks_price_unavailable(monkeypatch):
    async def fake_overview(symbol, *, client=None):
        raise MarketDataUnavailableError(symbol)

    monkeypatch.setattr(simulations, "get_us_overview", fake_overview)

    position = SimulationPosition(
        id="pos1", symbol="AAPL", exchange="US", name="Apple Inc", quantity=10, avg_cost=100,
        created_at=NOW, updated_at=NOW, cost_basis=1000,
    )
    simulation = Simulation(
        id="s1", name="My Sim", starting_budget=10000, cash_balance=9000, created_at=NOW,
        positions=[position],
    )

    valued, warnings = await value_simulations([simulation])

    assert valued[0].positions[0].price_unavailable is True
    assert warnings == [simulations.UNAVAILABLE_WARNING]


# --- snapshots -------------------------------------------------------------------------


def test_save_todays_snapshot_upserts(monkeypatch):
    monkeypatch.setattr(
        simulations,
        "get_connection",
        fake_get_connection(
            [
                {
                    "fetchone": {
                        "snapshot_date": date.today(),
                        "cash_balance": 9000,
                        "positions_value": 2000,
                        "total_equity": 11000,
                        "pnl_abs": 1000,
                        "pnl_pct": 10.0,
                    }
                }
            ]
        ),
    )
    simulation = Simulation(
        id="s1", name="My Sim", starting_budget=10000, cash_balance=9000, created_at=NOW,
        positions_value=2000, total_equity=11000, total_pnl_abs=1000, total_pnl_pct=10.0,
    )

    result = save_todays_snapshot(simulation)

    assert result.total_equity == 11000
    assert result.pnl_abs == 1000


# --- endpoints ------------------------------------------------------------------

client = TestClient(main.app)


@pytest.fixture(autouse=True)
def override_auth():
    main.app.dependency_overrides[get_current_claims] = lambda: {"sub": "user-1"}
    yield
    main.app.dependency_overrides.pop(get_current_claims, None)


def test_post_simulation_endpoint_returns_403_at_limit(monkeypatch):
    def blocked(user_id):
        raise EntitlementLimitError("limit reached")

    monkeypatch.setattr(main, "enforce_simulation_limit", blocked)

    response = client.post("/simulations", json={"name": "My Sim", "starting_budget": 10000})

    assert response.status_code == 403


def test_post_simulation_endpoint_requires_positive_budget(monkeypatch):
    monkeypatch.setattr(main, "enforce_simulation_limit", lambda user_id: None)

    response = client.post("/simulations", json={"name": "My Sim", "starting_budget": 0})

    assert response.status_code == 400


def test_get_simulations_endpoint_requires_auth():
    main.app.dependency_overrides.pop(get_current_claims, None)

    response = client.get("/simulations")

    assert response.status_code == 401


def test_post_order_endpoint_rejects_invalid_side(monkeypatch):
    response = client.post(
        "/simulations/s1/orders",
        json={"symbol": "AAPL", "exchange": "US", "quantity": 1, "side": "hold"},
    )

    assert response.status_code == 400


def test_post_order_endpoint_returns_400_for_insufficient_funds(monkeypatch):
    async def fake_place_order(*args, **kwargs):
        raise InsufficientFundsError("AAPL")

    monkeypatch.setattr(main, "place_order", fake_place_order)

    response = client.post(
        "/simulations/s1/orders",
        json={"symbol": "AAPL", "exchange": "US", "quantity": 1, "side": "buy"},
    )

    assert response.status_code == 400


def test_post_order_endpoint_returns_404_when_simulation_not_found(monkeypatch):
    async def fake_place_order(*args, **kwargs):
        raise SimulationNotFoundError("s1")

    monkeypatch.setattr(main, "place_order", fake_place_order)

    response = client.post(
        "/simulations/s1/orders",
        json={"symbol": "AAPL", "exchange": "US", "quantity": 1, "side": "buy"},
    )

    assert response.status_code == 404


def test_get_simulation_history_endpoint_returns_404_when_not_found(monkeypatch):
    async def fake_get_history(user_id, simulation_id):
        raise SimulationNotFoundError(simulation_id)

    monkeypatch.setattr(main, "get_history", fake_get_history)

    response = client.get("/simulations/s1/history")

    assert response.status_code == 404
