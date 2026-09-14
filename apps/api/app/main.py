from fastapi import FastAPI, Response

from app.db import check_database_connection

app = FastAPI(title="borsa_app API")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/db")
def health_db(response: Response) -> dict[str, str]:
    if check_database_connection():
        return {"status": "ok"}
    response.status_code = 503
    return {"status": "unavailable"}
