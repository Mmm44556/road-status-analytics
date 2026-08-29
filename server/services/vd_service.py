from __future__ import annotations

import time
from dataclasses import dataclass
from threading import Lock
from typing import Any, Callable

from server.clients.tdx_client import TdxClient
from server.services.live_traffic_service import classify_vd_congestion_level
from server.services.road_event_service import normalize_city


@dataclass(frozen=True)
class CacheEntry:
    expires_at: float
    value: Any


class VdNotFoundError(Exception):
    pass


def _average_valid_lane_readings(
    lanes: list[dict[str, Any]],
) -> tuple[float | None, float | None]:
    """計算車道的平均車速與佔有率。

    車道底下各車種 Volume 加總為 0，代表這段時間沒有偵測到車輛，車速數值不
    具參考性，故排除，避免誤當成「時速 0 的塞車」。TDX 也會用負數（實測為
    -99）代表佔有率無資料，佔有率本身不可能是負值，一併排除，避免顯示成
    「佔有率 -99%」這種看似真實數據的錯誤畫面。
    """
    speeds: list[float] = []
    occupancies: list[float] = []
    for lane in lanes:
        occupancy = lane.get("Occupancy")
        if occupancy is not None and occupancy >= 0:
            occupancies.append(float(occupancy))

        speed = lane.get("Speed")
        total_volume = sum(
            vehicle.get("Volume", 0) or 0 for vehicle in lane.get("Vehicles", [])
        )
        if speed is None or speed < 0 or total_volume <= 0:
            continue
        speeds.append(float(speed))

    average_speed = round(sum(speeds) / len(speeds), 1) if speeds else None
    average_occupancy = (
        round(sum(occupancies) / len(occupancies), 1) if occupancies else None
    )
    return average_speed, average_occupancy


def merge_vd_live_data(
    vds: list[dict[str, Any]],
    vd_lives: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """依 VDID 合併 VD 靜態位置與即時讀數。

    一台 VD 可能同時偵測多個方向（DetectionLinks），依 LinkID 對應各自的即時
    車道讀數；找不到即時資料或沒有有效讀數的方向，車速／佔有率回傳 None，前
    端顯示「未提供」，不用 0 頂替。
    """
    live_by_vd_id = {item.get("VDID"): item for item in vd_lives}
    merged: list[dict[str, Any]] = []

    for vd in vds:
        vd_id = vd.get("VDID")
        live = live_by_vd_id.get(vd_id)
        link_flows_by_id = {
            flow.get("LinkID"): flow for flow in (live.get("LinkFlows", []) if live else [])
        }

        links = []
        for detection_link in vd.get("DetectionLinks", []):
            link_id = detection_link.get("LinkID")
            flow = link_flows_by_id.get(link_id)
            lanes = flow.get("Lanes", []) if flow else []
            average_speed, average_occupancy = _average_valid_lane_readings(lanes)
            # 重用即時路況圖層（一般道路）同一套車速門檻，讓 VD 的白話路況跟
            # 地圖上市區道路線段的壅塞等級一致，不是兩套各自獨立的標準。
            congestion_level = (
                classify_vd_congestion_level(average_speed)
                if average_speed is not None
                else None
            )
            links.append(
                {
                    "linkId": link_id,
                    "roadDirection": detection_link.get("RoadDirection", ""),
                    "laneCount": detection_link.get("ActualLaneNum")
                    or detection_link.get("LaneNum"),
                    "averageSpeed": average_speed,
                    "averageOccupancy": average_occupancy,
                    "congestionLevel": congestion_level,
                }
            )

        road_section = vd.get("RoadSection") or {}
        merged.append(
            {
                "vdId": vd_id,
                "positionLon": vd.get("PositionLon"),
                "positionLat": vd.get("PositionLat"),
                "roadName": vd.get("RoadName", ""),
                "roadSection": {
                    "start": road_section.get("Start", ""),
                    "end": road_section.get("End", ""),
                },
                "links": links,
            }
        )
    return merged


class VdService:
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

    def get_city_vds(self, city: str) -> dict[str, Any]:
        city_code = normalize_city(city)
        city_scope = f"City/{city_code}"

        vds = self._get_cached(
            f"vd:{city_code}",
            self._static_ttl_seconds,
            lambda: self._client.fetch_road_traffic("VD", city_scope),
        )
        vd_live = self._get_cached(
            f"vd-live:{city_code}",
            self._live_ttl_seconds,
            lambda: self._client.fetch_road_traffic("Live/VD", city_scope),
        )

        return {
            "city": city_code,
            "vds": merge_vd_live_data(vds.get("VDs", []), vd_live.get("VDLives", [])),
        }

    def get_single_vd(self, city: str, vd_id: str) -> dict[str, Any]:
        """手動刷新單一 VD：靜態位置沿用已快取的整批清單，只有即時讀數用
        OData $filter 單獨打一次 TDX，不影響、也不重置整批的 TTL 快取。
        """
        city_code = normalize_city(city)
        city_scope = f"City/{city_code}"

        vds = self._get_cached(
            f"vd:{city_code}",
            self._static_ttl_seconds,
            lambda: self._client.fetch_road_traffic("VD", city_scope),
        ).get("VDs", [])
        vd = next((item for item in vds if item.get("VDID") == vd_id), None)
        if vd is None:
            raise VdNotFoundError(f"VD not found: {vd_id}")

        # OData 字串常值裡的單引號需要用兩個單引號跳脫。
        escaped_id = vd_id.replace("'", "''")
        vd_live = self._client.fetch_road_traffic(
            "Live/VD", city_scope, filter_expr=f"VDID eq '{escaped_id}'"
        )
        return merge_vd_live_data([vd], vd_live.get("VDLives", []))[0]
