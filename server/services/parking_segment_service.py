from __future__ import annotations

import time
from typing import Any, Callable

from server.clients.tdx_client import TdxClient
from server.services.coordinated_ttl_cache import CoordinatedTtlCache
from server.services.road_event_service import normalize_city


class SegmentNotFoundError(Exception):
    pass


def merge_parking_segment_data(
    segments: list[dict[str, Any]],
    availabilities: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """依 ParkingSegmentID 合併路邊停車格路段靜態資料與即時可用車位。

    這支 API 回傳的是「路段」層級的空位數（例如「建軍路還有 3 格」），不是每
    一格車位各自的感測狀態，所以不宜取名或呈現成「這一格有沒有車」。

    找不到對應即時資料的路段，即時欄位一律回傳 None，前端顯示「未提供」，
    不用 0 頂替。FullStatus 跟戶外停車場一樣與 AvailableSpaces==0 對應，不
    另外保留，前端可直接用 availableSpaces === 0 判斷已滿。
    """
    availability_by_id = {item.get("ParkingSegmentID"): item for item in availabilities}
    merged: list[dict[str, Any]] = []

    for segment in segments:
        segment_id = segment.get("ParkingSegmentID")
        availability = availability_by_id.get(segment_id)
        position = segment.get("ParkingSegmentPosition") or {}
        name = segment.get("ParkingSegmentName") or {}

        merged.append(
            {
                "segmentId": segment_id,
                "name": name.get("Zh_tw", ""),
                "description": segment.get("Description", ""),
                "positionLon": position.get("PositionLon"),
                "positionLat": position.get("PositionLat"),
                "fareDescription": segment.get("FareDescription", ""),
                "totalSpaces": availability.get("TotalSpaces") if availability else None,
                "availableSpaces": availability.get("AvailableSpaces") if availability else None,
                "serviceStatus": availability.get("ServiceStatus") if availability else None,
                "updateTime": availability.get("DataCollectTime") if availability else None,
            }
        )
    return merged


class ParkingSegmentService:
    def __init__(
        self,
        client: TdxClient,
        *,
        static_ttl_seconds: int = 21_600,
        live_ttl_seconds: int = 60,
        static_stale_seconds: int = 3_600,
        live_stale_seconds: int = 300,
        clock: Callable[[], float] = time.time,
        cache: CoordinatedTtlCache | None = None,
    ) -> None:
        self._client = client
        self._static_ttl_seconds = static_ttl_seconds
        self._live_ttl_seconds = live_ttl_seconds
        self._static_stale_seconds = static_stale_seconds
        self._live_stale_seconds = live_stale_seconds
        self._cache = cache or CoordinatedTtlCache(clock=clock)

    def _get_cached(self, key: str, ttl: int, loader: Callable[[], Any]) -> Any:
        stale = (
            self._static_stale_seconds
            if ttl == self._static_ttl_seconds
            else self._live_stale_seconds
        )
        return self._cache.get(key, ttl, stale, loader)

    def get_city_parking_segments(self, city: str) -> dict[str, Any]:
        city_code = normalize_city(city)
        city_scope = f"City/{city_code}"

        segments = self._get_cached(
            f"parking-segment:{city_code}",
            self._static_ttl_seconds,
            lambda: self._client.fetch_parking_data("OnStreet/ParkingSegment", city_scope),
        ).get("ParkingSegments", [])
        # 這支即時資料的回應鍵是 CurbParkingSegmentAvailabilities，跟資源路徑
        # 本身的命名（ParkingSegmentAvailability）不一致，已用真實 API 驗證過。
        availabilities = self._get_cached(
            f"parking-segment-availability:{city_code}",
            self._live_ttl_seconds,
            lambda: self._client.fetch_parking_data(
                "OnStreet/ParkingSegmentAvailability", city_scope
            ),
        ).get("CurbParkingSegmentAvailabilities", [])

        return {
            "city": city_code,
            "segments": merge_parking_segment_data(segments, availabilities),
        }

    def get_single_segment(self, city: str, segment_id: str) -> dict[str, Any]:
        """手動刷新單一路段：靜態資料沿用已快取的整批清單，只有即時可用
        車位數用 OData $filter 單獨打一次 TDX，不影響、也不重置整批的 TTL 快取。
        """
        city_code = normalize_city(city)
        city_scope = f"City/{city_code}"

        segments = self._get_cached(
            f"parking-segment:{city_code}",
            self._static_ttl_seconds,
            lambda: self._client.fetch_parking_data("OnStreet/ParkingSegment", city_scope),
        ).get("ParkingSegments", [])
        segment = next(
            (item for item in segments if item.get("ParkingSegmentID") == segment_id), None
        )
        if segment is None:
            raise SegmentNotFoundError(f"parking segment not found: {segment_id}")

        # OData 字串常值裡的單引號需要用兩個單引號跳脫。
        escaped_id = segment_id.replace("'", "''")
        availabilities = self._client.fetch_parking_data(
            "OnStreet/ParkingSegmentAvailability",
            city_scope,
            filter_expr=f"ParkingSegmentID eq '{escaped_id}'",
        ).get("CurbParkingSegmentAvailabilities", [])
        return merge_parking_segment_data([segment], availabilities)[0]
