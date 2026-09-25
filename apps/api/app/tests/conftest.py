import pytest

from app import entitlements, market_data


@pytest.fixture(autouse=True)
def _disable_all_features_free_promo(monkeypatch):
    """Most tests assert real free/premium entitlement gating; the temporary
    ALL_FEATURES_FREE promo (see app/entitlements.py) would make every one of them see
    unlocked "promo" entitlements instead unless disabled by default. Tests that
    specifically want to exercise the promo behavior override it back to True."""
    monkeypatch.setattr(entitlements, "ALL_FEATURES_FREE", False)


@pytest.fixture(autouse=True)
def _enable_bist(monkeypatch):
    """BIST is switched off in production for now (market_data.BIST_ENABLED); the existing
    BIST tests cover the enabled code paths, so they run with it on. Tests of the disabled
    behavior switch it back off explicitly."""
    monkeypatch.setattr(market_data, "BIST_ENABLED", True)
