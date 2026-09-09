from __future__ import annotations

import time
from typing import Any, Callable

from server.clients.tdx_client import TdxClient
from server.services.coordinated_ttl_cache import CoordinatedTtlCache


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

# TDX 的一般事件（Event）與即時事件（LiveEvent）縣市覆蓋不同。
# 未涵蓋一般事件的縣市仍應回傳即時事件，避免整個圖層失效。
PREVIEW_EVENT_CITIES = {
    "Keelung", "Taipei", "NewTaipei", "Taoyuan", "MiaoliCounty",
    "Taichung", "ChiayiCounty", "Tainan", "PingtungCounty",
    "YilanCounty", "KinmenCounty",
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


class RoadEventService:
    def __init__(
        self,
        client: TdxClient,
        *,
        ttl_seconds: int = 120,
        stale_seconds: int = 300,
        clock: Callable[[], float] = time.time,
        cache: CoordinatedTtlCache | None = None,
    ) -> None:
        self._client = client
        self._ttl_seconds = ttl_seconds
        self._stale_seconds = stale_seconds
        self._cache = cache or CoordinatedTtlCache(clock=clock)

    def get_city_events(self, city: str, *, top: int) -> dict[str, Any]:
        city_code = normalize_city(city)
        cache_key = f"road-events:{city_code}:{top}"

        def load_events() -> dict[str, Any]:
            preview = (
                self._client.fetch_city_events(city_code, live=False, top=top)
                if city_code in PREVIEW_EVENT_CITIES
                else {"Events": []}
            )
            return {
                "city": city_code,
                "preview": preview,
                "live": self._client.fetch_city_events(city_code, live=True, top=top),
            }

        return self._cache.get(
            cache_key,
            self._ttl_seconds,
            self._stale_seconds,
            load_events,
        )
