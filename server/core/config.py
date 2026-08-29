from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache

from dotenv import load_dotenv


@dataclass(frozen=True)
class Settings:
    tdx_client_id: str
    tdx_client_secret: str
    allowed_origins: tuple[str, ...]


@lru_cache
def get_settings() -> Settings:
    # 設定只讀取一次，避免每次請求重載環境變數。
    load_dotenv()
    origins = tuple(
        origin.strip()
        for origin in os.getenv(
            "ALLOWED_ORIGINS",
            "http://127.0.0.1:5173,http://localhost:5173",
        ).split(",")
        if origin.strip()
    )
    return Settings(
        tdx_client_id=os.getenv("TDX_CLIENT_ID", "").strip(),
        tdx_client_secret=os.getenv("TDX_CLIENT_SECRET", "").strip(),
        allowed_origins=origins,
    )
