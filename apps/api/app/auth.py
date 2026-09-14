from functools import lru_cache

import jwt
from fastapi import Header, HTTPException, status

from app.config import get_settings


class AuthError(HTTPException):
    def __init__(self, detail: str = "Could not validate credentials") -> None:
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


@lru_cache
def get_jwk_client() -> jwt.PyJWKClient:
    settings = get_settings()
    jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
    return jwt.PyJWKClient(jwks_url)


def decode_supabase_jwt(token: str) -> dict:
    settings = get_settings()
    try:
        signing_key = get_jwk_client().get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "ES256"],
            audience="authenticated",
            issuer=f"{settings.supabase_url}/auth/v1",
        )
    except jwt.PyJWTError as exc:
        raise AuthError() from exc


def get_current_claims(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise AuthError("Missing bearer token")
    token = authorization.split(" ", 1)[1]
    return decode_supabase_jwt(token)
