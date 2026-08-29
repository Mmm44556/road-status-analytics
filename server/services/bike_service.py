from __future__ import annotations

import time
from dataclasses import dataclass
from threading import Lock
from typing import Any, Callable

from server.clients.tdx_client import TdxClient
from server.services.road_event_service import normalize_city


@dataclass(frozen=True)
class CacheEntry:
    expires_at: float
    value: Any


class StationNotFoundError(Exception):
    pass


def merge_bike_data(
    stations: list[dict[str, Any]],
    availabilities: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """依 StationUID 合併站點靜態資料與即時可借還數量。

    找不到對應即時資料的站點（例如剛上線、尚未回報），即時欄位一律回傳 None，
    前端顯示「未提供」，不用 0 頂替。
    """
    availability_by_id = {item.get("StationUID"): item for item in availabilities}
    merged: list[dict[str, Any]] = []

    for station in stations:
        station_id = station.get("StationUID")
        availability = availability_by_id.get(station_id)
        position = station.get("StationPosition") or {}
        name = station.get("StationName") or {}
        address = station.get("StationAddress") or {}
        rent_detail = (availability or {}).get("AvailableRentBikesDetail") or {}

        merged.append(
            {
                "stationId": station_id,
                "name": name.get("Zh_tw", ""),
                "address": address.get("Zh_tw", ""),
                "positionLon": position.get("PositionLon"),
                "positionLat": position.get("PositionLat"),
                "capacity": station.get("BikesCapacity"),
                "serviceStatus": availability.get("ServiceStatus") if availability else None,
                "availableRentBikes": availability.get("AvailableRentBikes") if availability else None,
                "availableReturnBikes": availability.get("AvailableReturnBikes") if availability else None,
                "availableElectricBikes": rent_detail.get("ElectricBikes"),
                # SrcUpdateTime 是站點本身回報的時間，比 TDX 平台快取更新的
                # UpdateTime 更能反映資料真正的新舊（兩者實務上常差距數小時）。
                "updateTime": (
                    (availability.get("SrcUpdateTime") or availability.get("UpdateTime"))
                    if availability
                    else None
                ),
            }
        )
    return merged


class BikeService:
    def __init__(
        self,
        client: TdxClient,
        *,
        static_ttl_seconds: int = 21_600,
        live_ttl_seconds: int = 60,
        clock: Callable[[], float] = time.time,
    ) -> None:
        self._client = client
        self._static_ttl_seconds = static_ttl_seconds
        self._live_ttl_seconds = live_ttl_seconds
        self._clock = clock
        self._cache: dict[str, CacheEntry] = {}
        self._lock = Lock()

    def _get_cached(self, key: str, ttl: int, loader: Callable[[], Any]) -> Any:
        now = self._clock()
        with self._lock:
            cached = self._cache.get(key)
            if cached and now < cached.expires_at:
                return cached.value
        value = loader()
        with self._lock:
            self._cache[key] = CacheEntry(now + ttl, value)
        return value

    def get_city_bikes(self, city: str) -> dict[str, Any]:
        city_code = normalize_city(city)
        city_scope = f"City/{city_code}"

        stations = self._get_cached(
            f"bike-station:{city_code}",
            self._static_ttl_seconds,
            lambda: self._client.fetch_bike_data("Station", city_scope),
        )
        availabilities = self._get_cached(
            f"bike-availability:{city_code}",
            self._live_ttl_seconds,
            lambda: self._client.fetch_bike_data("Availability", city_scope),
        )

        return {
            "city": city_code,
            "stations": merge_bike_data(stations, availabilities),
        }

    def get_single_station(self, city: str, station_id: str) -> dict[str, Any]:
        """手動刷新單一站點：靜態資料沿用已快取的整批清單，只有即時可借還
        數量用 OData $filter 單獨打一次 TDX，不影響、也不重置整批的 TTL 快取。
        """
        city_code = normalize_city(city)
        city_scope = f"City/{city_code}"

        stations = self._get_cached(
            f"bike-station:{city_code}",
            self._static_ttl_seconds,
            lambda: self._client.fetch_bike_data("Station", city_scope),
        )
        station = next(
            (item for item in stations if item.get("StationUID") == station_id), None
        )
        if station is None:
            raise StationNotFoundError(f"station not found: {station_id}")

        # OData 字串常值裡的單引號需要用兩個單引號跳脫。
        escaped_id = station_id.replace("'", "''")
        availabilities = self._client.fetch_bike_data(
            "Availability", city_scope, filter_expr=f"StationUID eq '{escaped_id}'"
        )
        return merge_bike_data([station], availabilities)[0]
