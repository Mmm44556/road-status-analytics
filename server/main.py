from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI

from server.api.router import api_router
from server.core.config import get_settings


settings = get_settings()
app = FastAPI(title="路況通 API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["Accept", "Content-Type"],
)
app.include_router(api_router)


@app.get("/")
def home() -> dict[str, str]:
    return {"name": "路況通 API", "docs": "/docs"}


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok"}
