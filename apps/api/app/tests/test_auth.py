from datetime import UTC, datetime, timedelta

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient

from app import auth
from app.config import Settings
from app.main import app

client = TestClient(app)

TEST_SUPABASE_URL = "https://test-project.supabase.co"


class _FakeSigningKey:
    def __init__(self, key) -> None:
        self.key = key


class _FakeJWKClient:
    def __init__(self, public_key) -> None:
        self._public_key = public_key

    def get_signing_key_from_jwt(self, token: str) -> _FakeSigningKey:
        return _FakeSigningKey(self._public_key)


@pytest.fixture
def rsa_keypair():
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    return private_key, private_key.public_key()


@pytest.fixture(autouse=True)
def patch_settings(monkeypatch):
    monkeypatch.setattr(
        auth, "get_settings", lambda: Settings(supabase_url=TEST_SUPABASE_URL)
    )


def _make_token(private_key, *, issuer=None, audience="authenticated", expired=False):
    now = datetime.now(UTC)
    payload = {
        "sub": "user-123",
        "email": "test@example.com",
        "aud": audience,
        "iss": issuer if issuer is not None else f"{TEST_SUPABASE_URL}/auth/v1",
        "iat": now,
        "exp": now - timedelta(minutes=5) if expired else now + timedelta(minutes=5),
    }
    return jwt.encode(payload, private_key, algorithm="RS256")


def test_decode_supabase_jwt_accepts_valid_token(monkeypatch, rsa_keypair):
    private_key, public_key = rsa_keypair
    monkeypatch.setattr(auth, "get_jwk_client", lambda: _FakeJWKClient(public_key))
    token = _make_token(private_key)

    claims = auth.decode_supabase_jwt(token)

    assert claims["sub"] == "user-123"
    assert claims["email"] == "test@example.com"


def test_decode_supabase_jwt_rejects_expired_token(monkeypatch, rsa_keypair):
    private_key, public_key = rsa_keypair
    monkeypatch.setattr(auth, "get_jwk_client", lambda: _FakeJWKClient(public_key))
    token = _make_token(private_key, expired=True)

    with pytest.raises(auth.AuthError):
        auth.decode_supabase_jwt(token)


def test_decode_supabase_jwt_rejects_wrong_issuer(monkeypatch, rsa_keypair):
    private_key, public_key = rsa_keypair
    monkeypatch.setattr(auth, "get_jwk_client", lambda: _FakeJWKClient(public_key))
    token = _make_token(private_key, issuer="https://someone-else.supabase.co/auth/v1")

    with pytest.raises(auth.AuthError):
        auth.decode_supabase_jwt(token)


def test_decode_supabase_jwt_rejects_wrong_audience(monkeypatch, rsa_keypair):
    private_key, public_key = rsa_keypair
    monkeypatch.setattr(auth, "get_jwk_client", lambda: _FakeJWKClient(public_key))
    token = _make_token(private_key, audience="unexpected")

    with pytest.raises(auth.AuthError):
        auth.decode_supabase_jwt(token)


def test_me_without_authorization_header_returns_401():
    response = client.get("/me")
    assert response.status_code == 401


def test_me_with_malformed_header_returns_401():
    response = client.get("/me", headers={"Authorization": "not-a-bearer-token"})
    assert response.status_code == 401


def test_me_with_valid_token_returns_claims(monkeypatch, rsa_keypair):
    private_key, public_key = rsa_keypair
    monkeypatch.setattr(auth, "get_jwk_client", lambda: _FakeJWKClient(public_key))
    token = _make_token(private_key)

    response = client.get("/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json() == {"id": "user-123", "email": "test@example.com"}


def test_me_with_expired_token_returns_401(monkeypatch, rsa_keypair):
    private_key, public_key = rsa_keypair
    monkeypatch.setattr(auth, "get_jwk_client", lambda: _FakeJWKClient(public_key))
    token = _make_token(private_key, expired=True)

    response = client.get("/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 401
