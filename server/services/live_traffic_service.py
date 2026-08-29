from __future__ import annotations

import re
import time
import requests
from dataclasses import dataclass
from threading import Lock
from typing import Any, Callable

from server.clients.tdx_client import TdxClient
from server.services.road_event_service import normalize_city


CITY_BOUNDS = {
    "Kaohsiung": (120.15, 22.47, 120.96, 23.48),
}
TRAFFIC_SCOPES = ("Highway", "Freeway")
VD_SOURCE = "VD"

# TDX 只在國道/省道的 Live API 直接提供 CongestionLevel；市區道路走 VD，只有
# 原始車速，須自行換算等級，非官方數值。
#
# 高雄市區道路速限落差很大（巷弄常見 30 km/h、主幹道 50-60 km/h），若沿用跟
# 國道/省道一樣的五級門檻，車速偏低的道路即使本身順暢，也容易被單一門檻誤判
# 成「車多」甚至「壅塞」——這不只是精確度不夠，而是可能給出錯誤方向的結論。
# 因此改用較寬鬆、只分三級的門檻，且最高只判到「壅塞」，不宣稱能像官方資料
# 一樣細分出「嚴重壅塞」／「極度壅塞」。
VD_CONGESTION_SPEED_THRESHOLDS: tuple[tuple[float, int], ...] = (
    (25.0, 1),  # 順暢：多數市區道路在此車速以上仍算正常通行。
    (12.0, 2),  # 車多：明顯低於一般道路正常車速，但尚可移動。
)
VD_CONGESTION_LEVEL_CONGESTED = 3  # 未達以上任一門檻（< 12 km/h）視為壅塞。


@dataclass(frozen=True)
class CacheEntry:
    expires_at: float
    value: Any


def parse_linestring(wkt: str) -> list[list[float]]:
    match = re.fullmatch(r"\s*LINESTRING\s*\((.+)\)\s*", wkt, re.IGNORECASE)
    if not match:
        return []
    coordinates: list[list[float]] = []
    for pair in match.group(1).split(","):
        values = pair.strip().split()
        if len(values) < 2:
            return []
        try:
            coordinates.append([float(values[0]), float(values[1])])
        except ValueError:
            return []
    return coordinates if len(coordinates) >= 2 else []


def build_live_segments(
    sections: list[dict[str, Any]],
    shapes: list[dict[str, Any]],
    live_traffics: list[dict[str, Any]],
    bounds: tuple[float, float, float, float],
    source: str,
) -> list[dict[str, Any]]:
    min_lon, min_lat, max_lon, max_lat = bounds
    section_by_id = {item.get("SectionID"): item for item in sections}
    live_by_id = {item.get("SectionID"): item for item in live_traffics}
    segments = []

    for shape in shapes:
        section_id = shape.get("SectionID")
        live = live_by_id.get(section_id)
        if not section_id or not live:
            continue
        coordinates = parse_linestring(shape.get("Geometry", ""))
        if not any(
            min_lon <= lon <= max_lon and min_lat <= lat <= max_lat
            for lon, lat in coordinates
        ):
            continue
        section = section_by_id.get(section_id, {})
        try:
            congestion_level = int(live.get("CongestionLevel", -99))
        except (TypeError, ValueError):
            congestion_level = -99
        segments.append(
            {
                "sectionId": section_id,
                "roadName": section.get("RoadName", ""),
                "sectionName": section.get("SectionName", ""),
                "roadDirection": section.get("RoadDirection", ""),
                "coordinates": coordinates,
                "travelSpeed": live.get("TravelSpeed"),
                "travelTime": live.get("TravelTime"),
                "congestionLevel": congestion_level,
                "dataCollectTime": live.get("DataCollectTime", ""),
                "source": source,
            }
        )
    return segments


def classify_vd_congestion_level(speed_kph: float) -> int:
    """依 VD 車速換算壅塞等級（自訂啟發式門檻，非 TDX 官方數值）。"""
    for threshold, level in VD_CONGESTION_SPEED_THRESHOLDS:
        if speed_kph >= threshold:
            return level
    return VD_CONGESTION_LEVEL_CONGESTED


def aggregate_link_speeds(vd_lives: list[dict[str, Any]]) -> dict[str, list[float]]:
    """依 LinkID 收集有效車道車速。

    車道底下各車種 Volume 加總為 0，代表這段時間沒有偵測到車輛通過，車速數值
    不具參考性（可能是路況良好、也可能只是剛好沒車經過），故排除，避免誤當成
    「時速 0 的塞車」。
    """
    speeds_by_link: dict[str, list[float]] = {}
    for vd_live in vd_lives:
        for link_flow in vd_live.get("LinkFlows", []):
            link_id = link_flow.get("LinkID")
            if not link_id:
                continue
            for lane in link_flow.get("Lanes", []):
                speed = lane.get("Speed")
                total_volume = sum(
                    vehicle.get("Volume", 0) or 0
                    for vehicle in lane.get("Vehicles", [])
                )
                if speed is None or speed < 0 or total_volume <= 0:
                    continue
                speeds_by_link.setdefault(link_id, []).append(float(speed))
    return speeds_by_link


def build_vd_segments(
    sections: list[dict[str, Any]],
    shapes: list[dict[str, Any]],
    link_speeds: dict[str, list[float]],
    bounds: tuple[float, float, float, float],
    data_collect_time: str,
    excluded_road_names: frozenset[str] = frozenset(),
) -> list[dict[str, Any]]:
    """將市區道路 Section 依其 LinkIDs 對應到 VD 有效車速，換算壅塞等級。

    沒有任何 LinkID 對到有效車速的路段直接跳過，不產生假的「順暢」資料。

    市區道路的 Section 清單也會包含行經市區的省道／國道（例如台17線），這些
    已經由 Highway／Freeway 官方 CongestionLevel 涵蓋，若同一條路再用 VD 估算
    一次，地圖上會出現兩條路線重疊、甚至等級互相矛盾的線段。excluded_road_names
    用來排除這些已有官方資料的道路，讓 VD 只補「officially 沒有涵蓋」的一般道路。
    """
    min_lon, min_lat, max_lon, max_lat = bounds
    shape_by_id = {item.get("SectionID"): item for item in shapes}
    segments = []

    for section in sections:
        road_name = section.get("RoadName", "")
        if road_name and road_name in excluded_road_names:
            continue
        section_id = section.get("SectionID")
        link_ids = [link.get("LinkID") for link in section.get("LinkIDs", [])]
        speeds = [
            speed
            for link_id in link_ids
            for speed in link_speeds.get(link_id, [])
        ]
        if not section_id or not speeds:
            continue

        shape = shape_by_id.get(section_id)
        if not shape:
            continue
        coordinates = parse_linestring(shape.get("Geometry", ""))
        if not any(
            min_lon <= lon <= max_lon and min_lat <= lat <= max_lat
            for lon, lat in coordinates
        ):
            continue

        average_speed = sum(speeds) / len(speeds)
        segments.append(
            {
                "sectionId": section_id,
                "roadName": road_name,
                "sectionName": section.get("SectionName", ""),
                "roadDirection": section.get("RoadDirection", ""),
                "coordinates": coordinates,
                "travelSpeed": round(average_speed, 1),
                "travelTime": None,
                "congestionLevel": classify_vd_congestion_level(average_speed),
                "dataCollectTime": data_collect_time,
                "source": VD_SOURCE,
            }
        )
    return segments


class LiveTrafficService:
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

    def get_city_live_traffic(self, city: str) -> dict[str, Any]:
        city_code = normalize_city(city)
        bounds = CITY_BOUNDS.get(city_code)
        if bounds is None:
            raise ValueError(f"Live traffic bounds are not configured: {city}")

        segments: list[dict[str, Any]] = []
        update_times = []
        successful_sources = 0
        last_error: requests.RequestException | None = None
        for scope in TRAFFIC_SCOPES:
            try:
                sections = self._get_cached(
                    f"sections:{scope}:{city_code}",
                    self._static_ttl_seconds,
                    lambda scope=scope: self._client.fetch_road_traffic("Section", scope),
                )
                shapes = self._get_cached(
                    f"shapes:{scope}:{city_code}",
                    self._static_ttl_seconds,
                    lambda scope=scope: self._client.fetch_road_traffic("SectionShape", scope),
                )
                live = self._get_cached(
                    f"live:{scope}:{city_code}",
                    self._live_ttl_seconds,
                    lambda scope=scope: self._client.fetch_road_traffic("Live", scope),
                )
            except requests.RequestException as error:
                # 免費額度可能在冷啟動時限制連續請求；保留已成功來源，避免整層失效。
                last_error = error
                continue
            successful_sources += 1
            update_times.append(live.get("UpdateTime", ""))
            segments.extend(
                build_live_segments(
                    sections.get("Sections", []),
                    shapes.get("SectionShapes", []),
                    live.get("LiveTraffics", []),
                    bounds,
                    scope,
                )
            )

        # 市區道路沒有官方即時壅塞資料（Live/City 不支援高雄），改用 VD 車速推估。
        city_scope = f"City/{city_code}"
        try:
            city_sections = self._get_cached(
                f"sections:City:{city_code}",
                self._static_ttl_seconds,
                lambda: self._client.fetch_road_traffic("Section", city_scope),
            )
            city_shapes = self._get_cached(
                f"shapes:City:{city_code}",
                self._static_ttl_seconds,
                lambda: self._client.fetch_road_traffic("SectionShape", city_scope),
            )
            # Live/VD 的 LinkFlows 已經直接帶 LinkID，不需要另外抓 VD 靜態清單來對應。
            vd_live = self._get_cached(
                f"vd-live:City:{city_code}",
                self._live_ttl_seconds,
                lambda: self._client.fetch_road_traffic("Live/VD", city_scope),
            )
        except requests.RequestException as error:
            last_error = error
        else:
            successful_sources += 1
            data_collect_time = vd_live.get("SrcUpdateTime") or vd_live.get("UpdateTime", "")
            update_times.append(data_collect_time)
            link_speeds = aggregate_link_speeds(vd_live.get("VDLives", []))
            # 市區道路 Section 清單也包含行經市區的省道/國道，已由上面 Highway/
            # Freeway 官方資料涵蓋，排除同名道路避免地圖上出現重疊甚至互相矛盾的線段。
            covered_road_names = frozenset(
                segment["roadName"] for segment in segments if segment["roadName"]
            )
            segments.extend(
                build_vd_segments(
                    city_sections.get("Sections", []),
                    city_shapes.get("SectionShapes", []),
                    link_speeds,
                    bounds,
                    data_collect_time,
                    excluded_road_names=covered_road_names,
                )
            )

        if successful_sources == 0 and last_error:
            raise last_error
        return {
            "city": city_code,
            "updatedAt": max(update_times, default=""),
            "segments": segments,
        }
