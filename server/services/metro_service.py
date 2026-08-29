from __future__ import annotations

import time
import requests
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


# 捷運／輕軌不是依城市查詢，是依營運單位代碼；目前只有高雄設定對應單位，
# 其他城市回傳空站點清單（不是錯誤）。
CITY_METRO_OPERATORS: dict[str, tuple[tuple[str, str], ...]] = {
    "Kaohsiung": (("KRTC", "捷運"), ("KLRT", "輕軌")),
}


def merge_metro_data(
    stations: list[dict[str, Any]],
    live_boards: list[dict[str, Any]],
    system_label: str,
) -> list[dict[str, Any]]:
    """依 StationID 合併站點與即時到站資料。

    LiveBoard 同一站同方向（TripHeadSign）常見兩筆以上（下一班、下下班），
    只保留 EstimateTime 最小的一筆，避免 popup 塞進整批時刻表。

    同時記錄該筆的 UpdateTime，讓 popup 能顯示「這站最近一班車的資料是何時更新的」，
    取全站最快進站方向的 UpdateTime 當作該站的資料更新時間，而非個別方向各自顯示。
    """
    next_trains_by_station: dict[str, dict[str, dict[str, Any]]] = {}
    for board in live_boards:
        station_id = board.get("StationID")
        direction = board.get("TripHeadSign")
        estimate = board.get("EstimateTime")
        if not station_id or not direction or estimate is None:
            continue
        directions = next_trains_by_station.setdefault(station_id, {})
        existing = directions.get(direction)
        if existing is None or estimate < existing["estimate"]:
            directions[direction] = {
                "estimate": estimate,
                # SrcUpdateTime 是站方系統本身回報的時間，比 TDX 平台快取
                # 更新的 UpdateTime 更能反映資料真正的新舊。
                "updateTime": board.get("SrcUpdateTime") or board.get("UpdateTime"),
            }

    merged: list[dict[str, Any]] = []
    for station in stations:
        station_id = station.get("StationID")
        name = (station.get("StationName") or {}).get("Zh_tw", "")
        position = station.get("StationPosition") or {}
        directions = next_trains_by_station.get(station_id, {})
        soonest = min(directions.values(), key=lambda entry: entry["estimate"], default=None)
        merged.append(
            {
                "stationId": station.get("StationUID"),
                "name": name,
                "system": system_label,
                "positionLon": position.get("PositionLon"),
                "positionLat": position.get("PositionLat"),
                "nextTrains": [
                    {"direction": direction, "estimateMinutes": entry["estimate"]}
                    for direction, entry in directions.items()
                ],
                "updateTime": soonest["updateTime"] if soonest else None,
            }
        )
    return merged


class MetroService:
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

    def get_city_metro_stations(self, city: str) -> dict[str, Any]:
        city_code = normalize_city(city)
        operators = CITY_METRO_OPERATORS.get(city_code, ())
        stations: list[dict[str, Any]] = []
        if not operators:
            return {"city": city_code, "stations": stations}

        successful_sources = 0
        last_error: requests.RequestException | None = None
        for operator, label in operators:
            try:
                station_data = self._get_cached(
                    f"metro-station:{operator}",
                    self._static_ttl_seconds,
                    lambda operator=operator: self._client.fetch_metro_data("Station", operator),
                )
                live_data = self._get_cached(
                    f"metro-live:{operator}",
                    self._live_ttl_seconds,
                    lambda operator=operator: self._client.fetch_metro_data("LiveBoard", operator),
                )
            except requests.RequestException as error:
                # 一個系統（例如輕軌）暫時打不到，不要讓整層捷運圖層失效。
                last_error = error
                continue
            successful_sources += 1
            stations.extend(merge_metro_data(station_data, live_data, label))

        if successful_sources == 0 and last_error:
            raise last_error
        return {"city": city_code, "stations": stations}

    def get_single_station(self, city: str, station_uid: str) -> dict[str, Any]:
        """手動刷新單一站點：站點可能屬於任一營運單位，先在已快取的靜態站點
        清單中找出所屬單位，只對該單位的即時到站資料用 OData $filter 單獨打一次，
        不影響、也不重置整批的 TTL 快取。
        """
        city_code = normalize_city(city)
        operators = CITY_METRO_OPERATORS.get(city_code, ())

        for operator, label in operators:
            stations = self._get_cached(
                f"metro-station:{operator}",
                self._static_ttl_seconds,
                lambda operator=operator: self._client.fetch_metro_data("Station", operator),
            )
            station = next(
                (item for item in stations if item.get("StationUID") == station_uid), None
            )
            if station is None:
                continue

            # LiveBoard 是依 StationID（例如 "O1"）查詢，不是 StationUID（例如 "KRTC-O1"）。
            station_id = station.get("StationID") or ""
            escaped_id = station_id.replace("'", "''")
            live_boards = self._client.fetch_metro_data(
                "LiveBoard", operator, filter_expr=f"StationID eq '{escaped_id}'"
            )
            return merge_metro_data([station], live_boards, label)[0]

        raise StationNotFoundError(f"station not found: {station_uid}")
