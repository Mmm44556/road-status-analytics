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


class LotNotFoundError(Exception):
    pass


def merge_parking_lot_data(
    lots: list[dict[str, Any]],
    availabilities: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """依 CarParkID 合併停車場靜態資料與即時可用車位。

    找不到對應即時資料的停車場，即時欄位一律回傳 None，前端顯示「未提供」，
    不用 0 頂替。FullStatus 經實測與 AvailableSpaces==0 完全對應，不另外保留，
    前端可直接用 availableSpaces === 0 判斷已滿。
    """
    availability_by_id = {item.get("CarParkID"): item for item in availabilities}
    merged: list[dict[str, Any]] = []

    for lot in lots:
        lot_id = lot.get("CarParkID")
        availability = availability_by_id.get(lot_id)
        position = lot.get("CarParkPosition") or {}
        name = lot.get("CarParkName") or {}

        merged.append(
            {
                "lotId": lot_id,
                "name": name.get("Zh_tw", ""),
                "address": lot.get("Address", ""),
                "positionLon": position.get("PositionLon"),
                "positionLat": position.get("PositionLat"),
                "fareDescription": lot.get("FareDescription", ""),
                "isMotorcycle": bool(lot.get("IsMotorcycle")),
                "totalSpaces": availability.get("TotalSpaces") if availability else None,
                "availableSpaces": availability.get("AvailableSpaces") if availability else None,
                "serviceStatus": availability.get("ServiceStatus") if availability else None,
                "updateTime": availability.get("DataCollectTime") if availability else None,
            }
        )
    return merged


class ParkingLotService:
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

    def get_city_parking_lots(self, city: str) -> dict[str, Any]:
        city_code = normalize_city(city)
        city_scope = f"City/{city_code}"

        lots = self._get_cached(
            f"parking-lot:{city_code}",
            self._static_ttl_seconds,
            lambda: self._client.fetch_parking_data("OffStreet/CarPark", city_scope),
        ).get("CarParks", [])
        availabilities = self._get_cached(
            f"parking-lot-availability:{city_code}",
            self._live_ttl_seconds,
            lambda: self._client.fetch_parking_data("OffStreet/ParkingAvailability", city_scope),
        ).get("ParkingAvailabilities", [])

        return {
            "city": city_code,
            "lots": merge_parking_lot_data(lots, availabilities),
        }

    def get_single_lot(self, city: str, lot_id: str) -> dict[str, Any]:
        """手動刷新單一停車場：靜態資料沿用已快取的整批清單，只有即時可用
        車位數用 OData $filter 單獨打一次 TDX，不影響、也不重置整批的 TTL 快取。
        """
        city_code = normalize_city(city)
        city_scope = f"City/{city_code}"

        lots = self._get_cached(
            f"parking-lot:{city_code}",
            self._static_ttl_seconds,
            lambda: self._client.fetch_parking_data("OffStreet/CarPark", city_scope),
        ).get("CarParks", [])
        lot = next((item for item in lots if item.get("CarParkID") == lot_id), None)
        if lot is None:
            raise LotNotFoundError(f"parking lot not found: {lot_id}")

        # OData 字串常值裡的單引號需要用兩個單引號跳脫。
        escaped_id = lot_id.replace("'", "''")
        availabilities = self._client.fetch_parking_data(
            "OffStreet/ParkingAvailability",
            city_scope,
            filter_expr=f"CarParkID eq '{escaped_id}'",
        ).get("ParkingAvailabilities", [])
        return merge_parking_lot_data([lot], availabilities)[0]
