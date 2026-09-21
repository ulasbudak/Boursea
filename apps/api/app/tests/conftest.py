import pytest

from app import entitlements


@pytest.fixture(autouse=True)
def _disable_all_features_free_promo(monkeypatch):
    """Most tests assert real free/premium entitlement gating; the temporary
    ALL_FEATURES_FREE promo (see app/entitlements.py) would make every one of them see
    unlocked "promo" entitlements instead unless disabled by default. Tests that
    specifically want to exercise the promo behavior override it back to True."""
    monkeypatch.setattr(entitlements, "ALL_FEATURES_FREE", False)
