from fastapi import Depends, FastAPI, Response

from app.auth import get_current_claims
from app.db import check_database_connection

app = FastAPI(title="Trendus API")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/db")
def health_db(response: Response) -> dict[str, str]:
    if check_database_connection():
        return {"status": "ok"}
    response.status_code = 503
    return {"status": "unavailable"}


@app.get("/me")
def me(claims: dict = Depends(get_current_claims)) -> dict[str, str | None]:
    return {"id": claims.get("sub"), "email": claims.get("email")}
