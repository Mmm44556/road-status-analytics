from __future__ import annotations

import time
from dataclasses import dataclass
from threading import Lock
from typing import Any, Callable

from server.traffic.tdx_client import TdxClient


CITY_CODES = {
    "基隆市": "Keelung", "臺北市": "Taipei", "新北市": "NewTaipei",
    "桃園市": "Taoyuan", "新竹市": "Hsinchu", "新竹縣": "HsinchuCounty",
    "苗栗縣": "MiaoliCounty", "臺中市": "Taichung", "彰化縣": "ChanghuaCounty",
    "南投縣": "NantouCounty", "雲林縣": "YunlinCounty", "嘉義市": "Chiayi",
    "嘉義縣": "ChiayiCounty", "臺南市": "Tainan", "高雄市": "Kaohsiung",
    "屏東縣": "PingtungCounty", "宜蘭縣": "YilanCounty", "花蓮縣": "HualienCounty",
    "臺東縣": "TaitungCounty", "澎湖縣": "PenghuCounty", "金門縣": "KinmenCounty",
    "連江縣": "LienchiangCounty",
}


class UnsupportedCityError(ValueError):
    pass


def normalize_city(city: str) -> str:
    normalized = city.strip().replace("台", "臺")
    if normalized in CITY_CODES:
        return CITY_CODES[normalized]
    if normalized in CITY_CODES.values():
        return normalized
    raise UnsupportedCityError(f"Unsupported city: {city}")


@dataclass(frozen=True)
class CacheEntry:
    expires_at: float
    value: dict[str, Any]


class RoadEventService:
    def __init__(
        self,
        client: TdxClient,
        *,
        ttl_seconds: int = 120,
        clock: Callable[[], float] = time.time,
    ) -> None:
        self._client = client
        self._ttl_seconds = ttl_seconds
        self._clock = clock
        self._cache: dict[tuple[str, int], CacheEntry] = {}
        self._lock = Lock()

    def get_city_events(self, city: str, *, top: int) -> dict[str, Any]:
        city_code = normalize_city(city)
        cache_key = (city_code, top)
        now = self._clock()
        with self._lock:
            cached = self._cache.get(cache_key)
            if cached and now < cached.expires_at:
                return cached.value

        preview = self._client.fetch_city_events(city_code, live=False, top=top)
        live = self._client.fetch_city_events(city_code, live=True, top=top)
        value = {"city": city_code, "preview": preview, "live": live}
        with self._lock:
            self._cache[cache_key] = CacheEntry(now + self._ttl_seconds, value)
        return value
