from __future__ import annotations

import time
from dataclasses import dataclass
from threading import Lock
from typing import Any, Callable, Protocol

from server.services.road_event_service import CITY_CODES


class PlaceSearchProvider(Protocol):
    def search(self, query: str, *, limit: int) -> list[dict[str, Any]]: ...


_KNOWN_CITY_NAMES = frozenset(CITY_CODES.keys())


def _mentions_a_city(query: str) -> bool:
    """查詢字串裡是否已經包含任何一個縣市名稱（不限於目前選取的那個）。"""
    normalized = query.replace("台", "臺")
    return any(city_name in normalized for city_name in _KNOWN_CITY_NAMES)


@dataclass(frozen=True)
class CacheEntry:
    expires_at: float
    value: list[dict[str, Any]]


class PlaceSearchService:
    """加入縣市語境與短期快取，並隔離實際搜尋供應商。"""

    def __init__(
        self,
        client: PlaceSearchProvider,
        *,
        ttl_seconds: int = 300,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._client = client
        self._ttl_seconds = ttl_seconds
        self._clock = clock
        self._cache: dict[tuple[str, str, int], CacheEntry] = {}
        self._lock = Lock()

    def search(self, query: str, *, city: str | None, limit: int) -> list[dict[str, Any]]:
        normalized_query = " ".join(query.split())
        normalized_city = " ".join((city or "").split())
        cache_key = (normalized_query, normalized_city, limit)

        with self._lock:
            now = self._clock()
            cached = self._cache.get(cache_key)
            if cached and now < cached.expires_at:
                return cached.value

            # 查詢裡若已經指名任何縣市（不一定是目前選取的那個，例如選了臺北市、
            # 卻搜尋「高雄市正修科技大學」），就不要再把目前選取的縣市疊加上去，
            # 否則會拼出「臺北市高雄市正修科技大學」這種查不到結果的字串。
            provider_query = normalized_query
            if normalized_city and not _mentions_a_city(normalized_query):
                provider_query = f"{normalized_city}{normalized_query}"
            value = self._client.search(provider_query, limit=limit)
            completed_at = self._clock()
            self._cache[cache_key] = CacheEntry(
                expires_at=completed_at + self._ttl_seconds,
                value=value,
            )
            return value
