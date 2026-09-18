from contextlib import contextmanager
from datetime import UTC, datetime

import psycopg
import pytest
from fastapi.testclient import TestClient

from app import main, portfolios
from app.auth import get_current_claims
from app.market_data import MarketDataUnavailableError, StockOverview
from app.portfolios import (
    InsufficientQuantityError,
    Portfolio,
    PortfolioNotFoundError,
    Position,
    PositionNotFoundError,
    value_portfolios,
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
        self.committed = False

    def cursor(self, row_factory=None):
        return FakeCursor(self._responses)

    def commit(self):
        self.committed = True

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
        "portfolio_id": "f1",
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


# --- app/portfolios.py (data layer) ----------------------------------------------


def test_list_portfolios_returns_empty_when_none(monkeypatch):
    monkeypatch.setattr(portfolios, "get_connection", fake_get_connection([{"fetchall": []}]))

    assert portfolios.list_portfolios("user-1") == []


def test_list_portfolios_attaches_positions(monkeypatch):
    portfolio_row = {"id": "f1", "name": "US Growth", "created_at": NOW}
    monkeypatch.setattr(
        portfolios,
        "get_connection",
        fake_get_connection([{"fetchall": [portfolio_row]}, {"fetchall": [_position_row()]}]),
    )

    result = portfolios.list_portfolios("user-1")

    assert len(result) == 1
    assert result[0].name == "US Growth"
    assert len(result[0].positions) == 1
    assert result[0].positions[0].symbol == "AAPL"
    assert result[0].positions[0].cost_basis == 1000.0


def test_create_portfolio(monkeypatch):
    monkeypatch.setattr(
        portfolios,
        "get_connection",
        fake_get_connection([{"fetchone": {"id": "f1", "name": "New", "created_at": NOW}}]),
    )

    result = portfolios.create_portfolio("user-1", "New")

    assert result.id == "f1"
    assert result.name == "New"


def test_delete_portfolio_raises_when_not_found(monkeypatch):
    monkeypatch.setattr(portfolios, "get_connection", fake_get_connection([{"rowcount": 0}]))

    with pytest.raises(PortfolioNotFoundError):
        portfolios.delete_portfolio("user-1", "f1")


def test_add_transaction_buy_creates_new_position(monkeypatch):
    monkeypatch.setattr(
        portfolios,
        "get_connection",
        fake_get_connection(
            [
                {"fetchone": (1,)},
                {"fetchone": None},
                {"fetchone": _position_row(quantity=5, avg_cost=150)},
            ]
        ),
    )

    result = portfolios.add_transaction(
        "user-1",
        "f1",
        symbol="aapl",
        exchange="us",
        name="Apple Inc",
        quantity=5,
        price=150,
        side="buy",
    )

    assert result.symbol == "AAPL"


def test_add_transaction_buy_averages_existing_position(monkeypatch):
    # 10 @ 100 existing, buying 10 more @ 200 -> avg cost should become 150.
    monkeypatch.setattr(
        portfolios,
        "get_connection",
        fake_get_connection(
            [
                {"fetchone": (1,)},
                {"fetchone": {"id": "pos1", "quantity": 10, "avg_cost": 100}},
                {"fetchone": _position_row(quantity=20, avg_cost=150)},
            ]
        ),
    )

    result = portfolios.add_transaction(
        "user-1", "f1", symbol="AAPL", exchange="US", name=None, quantity=10, price=200, side="buy"
    )

    assert result.quantity == 20
    assert result.avg_cost == 150


def test_add_transaction_buy_raises_when_portfolio_not_found(monkeypatch):
    monkeypatch.setattr(portfolios, "get_connection", fake_get_connection([{"fetchone": None}]))

    with pytest.raises(PortfolioNotFoundError):
        portfolios.add_transaction(
            "user-1",
            "f1",
            symbol="AAPL",
            exchange="US",
            name=None,
            quantity=1,
            price=100,
            side="buy",
        )


def test_add_transaction_sell_raises_when_no_position(monkeypatch):
    monkeypatch.setattr(
        portfolios,
        "get_connection",
        fake_get_connection([{"fetchone": (1,)}, {"fetchone": None}]),
    )

    with pytest.raises(InsufficientQuantityError):
        portfolios.add_transaction(
            "user-1",
            "f1",
            symbol="AAPL",
            exchange="US",
            name=None,
            quantity=1,
            price=100,
            side="sell",
        )


def test_add_transaction_sell_raises_when_quantity_exceeds_holding(monkeypatch):
    monkeypatch.setattr(
        portfolios,
        "get_connection",
        fake_get_connection(
            [{"fetchone": (1,)}, {"fetchone": {"id": "pos1", "quantity": 5, "avg_cost": 100}}]
        ),
    )

    with pytest.raises(InsufficientQuantityError):
        portfolios.add_transaction(
            "user-1",
            "f1",
            symbol="AAPL",
            exchange="US",
            name=None,
            quantity=10,
            price=100,
            side="sell",
        )


def test_add_transaction_sell_partial_keeps_avg_cost(monkeypatch):
    monkeypatch.setattr(
        portfolios,
        "get_connection",
        fake_get_connection(
            [
                {"fetchone": (1,)},
                {"fetchone": {"id": "pos1", "quantity": 10, "avg_cost": 100}},
                {"fetchone": _position_row(quantity=4, avg_cost=100)},
            ]
        ),
    )

    result = portfolios.add_transaction(
        "user-1", "f1", symbol="AAPL", exchange="US", name=None, quantity=6, price=999, side="sell"
    )

    assert result.quantity == 4
    assert result.avg_cost == 100


def test_add_transaction_sell_full_removes_position(monkeypatch):
    monkeypatch.setattr(
        portfolios,
        "get_connection",
        fake_get_connection(
            [
                {"fetchone": (1,)},
                {"fetchone": {"id": "pos1", "quantity": 10, "avg_cost": 100}},
                {"fetchone": _position_row(quantity=0, avg_cost=100)},
            ]
        ),
    )

    portfolios.add_transaction(
        "user-1", "f1", symbol="AAPL", exchange="US", name=None, quantity=10, price=999, side="sell"
    )


def test_delete_position_raises_when_not_found(monkeypatch):
    monkeypatch.setattr(portfolios, "get_connection", fake_get_connection([{"rowcount": 0}]))

    with pytest.raises(PositionNotFoundError):
        portfolios.delete_position("user-1", "f1", "pos1")


# --- value_portfolios --------------------------------------------------------------


def _position(**overrides) -> Position:
    base = dict(
        id="pos1",
        symbol="AAPL",
        exchange="US",
        name="Apple Inc",
        quantity=10.0,
        avg_cost=100.0,
        created_at=NOW,
        updated_at=NOW,
        cost_basis=1000.0,
    )
    base.update(overrides)
    return Position(**base)


@pytest.mark.anyio
async def test_value_portfolios_computes_pnl_for_available_price(monkeypatch):
    async def fake_get_us_overview(symbol: str) -> StockOverview:
        return StockOverview(symbol=symbol, exchange="US", name="Apple Inc", price=150.0)

    monkeypatch.setattr(portfolios, "get_us_overview", fake_get_us_overview)

    portfolio = Portfolio(id="f1", name="Growth", created_at=NOW, positions=[_position()])
    valued, warnings = await value_portfolios([portfolio])

    position = valued[0].positions[0]
    assert position.current_price == 150.0
    assert position.market_value == 1500.0
    assert position.pnl_abs == 500.0
    assert position.pnl_pct == 50.0
    assert valued[0].total_market_value == 1500.0
    assert valued[0].total_pnl_abs == 500.0
    assert warnings == []


@pytest.mark.anyio
async def test_value_portfolios_flags_us_position_when_price_unavailable(monkeypatch):
    async def failing_get_us_overview(symbol: str) -> StockOverview:
        raise MarketDataUnavailableError("boom")

    monkeypatch.setattr(portfolios, "get_us_overview", failing_get_us_overview)

    portfolio = Portfolio(id="f1", name="Growth", created_at=NOW, positions=[_position()])
    valued, warnings = await value_portfolios([portfolio])

    position = valued[0].positions[0]
    assert position.price_unavailable is True
    assert position.market_value is None
    assert valued[0].total_market_value == 0.0
    assert portfolios.UNAVAILABLE_WARNING in warnings


@pytest.mark.anyio
async def test_value_portfolios_flags_bist_position_without_calling_finnhub(monkeypatch):
    async def unexpected_call(symbol: str) -> StockOverview:
        raise AssertionError("should not be called for BIST positions")

    monkeypatch.setattr(portfolios, "get_us_overview", unexpected_call)

    bist_position = _position(exchange="BIST", symbol="GARAN")
    portfolio = Portfolio(id="f1", name="BIST", created_at=NOW, positions=[bist_position])
    valued, warnings = await value_portfolios([portfolio])

    assert valued[0].positions[0].price_unavailable is True
    assert portfolios.BIST_UNAVAILABLE_WARNING in warnings


# --- /portfolios endpoints -----------------------------------------------------

client = TestClient(main.app)


@pytest.fixture(autouse=True)
def override_auth():
    main.app.dependency_overrides[get_current_claims] = lambda: {"sub": "user-1"}
    yield
    main.app.dependency_overrides.pop(get_current_claims, None)


def test_get_portfolios_endpoint(monkeypatch):
    sample = [Portfolio(id="f1", name="Growth", created_at=NOW, positions=[])]
    monkeypatch.setattr(main, "list_portfolios", lambda user_id: sample)

    response = client.get("/portfolios")

    assert response.status_code == 200
    assert response.json()["portfolios"][0]["name"] == "Growth"


def test_post_portfolio_endpoint_rejects_blank_name():
    response = client.post("/portfolios", json={"name": "  "})

    assert response.status_code == 400


def test_post_portfolio_endpoint_creates(monkeypatch):
    created = Portfolio(id="f1", name="New", created_at=NOW, positions=[])
    monkeypatch.setattr(main, "create_portfolio", lambda user_id, name: created)

    response = client.post("/portfolios", json={"name": "New"})

    assert response.status_code == 201
    assert response.json()["name"] == "New"


def test_delete_portfolio_endpoint_not_found(monkeypatch):
    def fake_delete(user_id, portfolio_id):
        raise PortfolioNotFoundError(portfolio_id)

    monkeypatch.setattr(main, "delete_portfolio", fake_delete)

    response = client.delete("/portfolios/f1")

    assert response.status_code == 404


def test_post_position_endpoint_rejects_bad_side():
    response = client.post(
        "/portfolios/f1/positions",
        json={"symbol": "AAPL", "exchange": "US", "quantity": 1, "price": 100, "side": "hold"},
    )

    assert response.status_code == 400


def test_post_position_endpoint_rejects_negative_quantity():
    response = client.post(
        "/portfolios/f1/positions",
        json={"symbol": "AAPL", "exchange": "US", "quantity": -1, "price": 100, "side": "buy"},
    )

    assert response.status_code == 400


def test_post_position_endpoint_maps_insufficient_quantity_to_400(monkeypatch):
    def fake_add_transaction(user_id, portfolio_id, **kwargs):
        raise InsufficientQuantityError("AAPL")

    monkeypatch.setattr(main, "add_transaction", fake_add_transaction)

    response = client.post(
        "/portfolios/f1/positions",
        json={"symbol": "AAPL", "exchange": "US", "quantity": 100, "price": 100, "side": "sell"},
    )

    assert response.status_code == 400


def test_post_position_endpoint_success(monkeypatch):
    position = _position()
    monkeypatch.setattr(main, "add_transaction", lambda user_id, portfolio_id, **kwargs: position)

    response = client.post(
        "/portfolios/f1/positions",
        json={"symbol": "aapl", "exchange": "us", "quantity": 10, "price": 100, "side": "buy"},
    )

    assert response.status_code == 201
    assert response.json()["symbol"] == "AAPL"


def test_delete_position_endpoint_success(monkeypatch):
    monkeypatch.setattr(
        main, "delete_position", lambda user_id, portfolio_id, position_id: None
    )

    response = client.delete("/portfolios/f1/positions/pos1")

    assert response.status_code == 204


def test_get_portfolios_endpoint_returns_503_on_db_error(monkeypatch):
    def fake_list(user_id):
        raise psycopg.OperationalError("down")

    monkeypatch.setattr(main, "list_portfolios", fake_list)

    response = client.get("/portfolios")

    assert response.status_code == 503


def test_portfolios_endpoint_requires_auth():
    main.app.dependency_overrides.pop(get_current_claims, None)

    response = client.get("/portfolios")

    assert response.status_code == 401
