from __future__ import annotations

import time
from typing import Any, Callable

from server.clients.tdx_client import TdxClient
from server.services.coordinated_ttl_cache import CoordinatedTtlCache
from server.services.live_traffic_service import parse_linestring
from server.services.road_event_service import normalize_city


class RouteShapeNotFoundError(Exception):
    pass


def normalize_bus_stops(stops: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """將 TDX 公車站牌資料依實體站位（StationID）合併成前端使用的穩定格式。

    TDX 的 Stop 資源是「每條路線各自一筆」，同一根實體站牌（同座標）只要服務
    的路線不同就會拆成多筆不同的 StopUID——實測「捷運巨蛋站(裕誠路)」西向站
    位就有 4 筆 StopUID，座標完全相同，分別對應 3、16A、16B、紅36裕誠幹線。
    用 TDX 自帶的 StationID 分組，同一實體站位在地圖上只顯示一個點；東西向
    各自的站牌 StationID 不同，仍會保留成不同的點。
    """
    groups: dict[str, list[dict[str, Any]]] = {}
    order: list[str] = []
    for stop in stops:
        station_id = str(
            stop.get("StationID") or stop.get("StopUID") or stop.get("StopID") or ""
        )
        if not station_id:
            continue
        if station_id not in groups:
            groups[station_id] = []
            order.append(station_id)
        groups[station_id].append(stop)

    normalized = []
    for station_id in order:
        group = groups[station_id]
        representative = group[0]
        position = representative.get("StopPosition") or {}
        longitude = position.get("PositionLon")
        latitude = position.get("PositionLat")
        if not isinstance(longitude, (int, float)) or not isinstance(latitude, (int, float)):
            continue
        update_times = [stop.get("UpdateTime") for stop in group if stop.get("UpdateTime")]
        normalized.append({
            "stopId": station_id,
            "name": str((representative.get("StopName") or {}).get("Zh_tw") or ""),
            "address": str(representative.get("StopAddress") or ""),
            "positionLon": float(longitude),
            "positionLat": float(latitude),
            "updateTime": max(update_times) if update_times else None,
        })
    return normalized


def _localized_text(value: Any) -> str:
    if isinstance(value, dict):
        return str(value.get("Zh_tw") or "")
    return str(value or "")


def normalize_bus_arrivals(
    arrivals: list[dict[str, Any]],
    routes: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """將 TDX N1 資料整理為單站 Popup 使用的穩定格式。"""
    route_by_uid = {
        str(route.get("RouteUID") or ""): route
        for route in routes
        if route.get("RouteUID")
    }
    normalized = []
    for arrival in arrivals:
        route_uid = str(arrival.get("RouteUID") or "")
        route = route_by_uid.get(route_uid, {})
        direction = arrival.get("Direction")
        if direction not in (0, 1):
            direction = 0
        destination = _localized_text(arrival.get("DestinationStopNameZh"))
        if not destination:
            destination_key = (
                "DestinationStopNameZh" if direction == 0 else "DepartureStopNameZh"
            )
            destination = _localized_text(route.get(destination_key))
        estimate = arrival.get("EstimateTime")
        normalized.append({
            "routeId": route_uid or str(arrival.get("RouteID") or ""),
            "routeName": _localized_text(arrival.get("RouteName")),
            "direction": direction,
            "destination": destination,
            "estimateSeconds": int(estimate) if isinstance(estimate, (int, float)) else None,
            "stopStatus": int(arrival.get("StopStatus") or 0),
            "plateNumber": str(arrival.get("PlateNumb") or ""),
            "nextBusTime": arrival.get("NextBusTime"),
            "isLastBus": bool(arrival.get("IsLastBus")),
            "updateTime": arrival.get("SrcUpdateTime") or arrival.get("UpdateTime"),
        })
    return sorted(
        normalized,
        key=lambda item: (
            item["stopStatus"] != 0,
            item["estimateSeconds"] is None,
            item["estimateSeconds"] or 0,
            item["routeName"],
        ),
    )


def normalize_route_shape(
    shapes: list[dict[str, Any]],
    route_id: str,
    direction: int,
) -> dict[str, Any] | None:
    """從 TDX Shape 資料取出指定路線＋方向的行駛路徑。"""
    for shape in shapes:
        if str(shape.get("RouteUID") or "") != route_id:
            continue
        if int(shape.get("Direction") if shape.get("Direction") is not None else -1) != direction:
            continue
        coordinates = parse_linestring(shape.get("Geometry", ""))
        if not coordinates:
            continue
        return {
            "routeId": route_id,
            "routeName": str((shape.get("RouteName") or {}).get("Zh_tw") or ""),
            "direction": direction,
            "coordinates": coordinates,
            "updateTime": shape.get("UpdateTime"),
        }
    return None


class BusService:
    """提供依縣市查詢且具快取的公車站牌資料。"""

    def __init__(
        self,
        client: TdxClient,
        *,
        ttl_seconds: int = 21_600,
        stale_seconds: int = 3_600,
        clock: Callable[[], float] = time.time,
        cache: CoordinatedTtlCache | None = None,
    ) -> None:
        self._client = client
        self._ttl_seconds = ttl_seconds
        self._stale_seconds = stale_seconds
        self._cache = cache or CoordinatedTtlCache(clock=clock)

    def get_city_stops(self, city: str) -> dict[str, Any]:
        city_code = normalize_city(city)
        stops = self._cache.get(
            f"bus-stop:{city_code}",
            self._ttl_seconds,
            self._stale_seconds,
            lambda: self._client.fetch_bus_data("Stop", f"City/{city_code}"),
        )
        return {"city": city_code, "stops": normalize_bus_stops(stops)}

    def get_stop_arrivals(self, city: str, stop_id: str) -> dict[str, Any]:
        """取得單一實體站位（StationID）合併後的預估到站資訊。

        同一個 StationID 底下可能有多筆 StopUID（同站牌、不同路線各自一筆），
        要把它們的即時到站資料全部查出來合併，popup 才會顯示行經該站位的
        所有路線，而不是只有其中一條。
        """
        city_code = normalize_city(city)
        city_scope = f"City/{city_code}"
        raw_stops = self._cache.get(
            f"bus-stop:{city_code}",
            self._ttl_seconds,
            self._stale_seconds,
            lambda: self._client.fetch_bus_data("Stop", f"City/{city_code}"),
        )
        stop_uids = [
            str(stop.get("StopUID"))
            for stop in raw_stops
            if str(stop.get("StationID") or "") == stop_id and stop.get("StopUID")
        ]
        if not stop_uids:
            # 相容找不到對應站位的情況：把傳入值當成單一 StopUID 直接查。
            stop_uids = [stop_id]

        routes = self._cache.get(
            f"bus-route:{city_code}",
            self._ttl_seconds,
            self._stale_seconds,
            lambda: self._client.fetch_bus_data(
                "Route",
                city_scope,
                select=(
                    "RouteUID,RouteID,RouteName,DepartureStopNameZh,"
                    "DestinationStopNameZh"
                ),
            ),
        )
        # OData 字串常值裡的單引號需要用兩個單引號跳脫。
        escaped_uids = [uid.replace("'", "''") for uid in stop_uids]
        filter_expr = " or ".join(f"StopUID eq '{uid}'" for uid in escaped_uids)
        arrivals = self._cache.get(
            f"bus-arrival:{city_code}:{stop_id}",
            30,
            120,
            lambda: self._client.fetch_bus_data(
                "EstimatedTimeOfArrival",
                city_scope,
                filter_expr=filter_expr,
                select=(
                    "StopUID,RouteUID,RouteID,RouteName,Direction,EstimateTime,"
                    "StopStatus,PlateNumb,NextBusTime,IsLastBus,SrcUpdateTime,"
                    "UpdateTime"
                ),
            ),
        )
        return {
            "city": city_code,
            "stopId": stop_id,
            "arrivals": normalize_bus_arrivals(arrivals, routes),
        }

    def get_route_shape(self, city: str, route_id: str, direction: int) -> dict[str, Any]:
        """取得單一路線＋方向的行駛路徑，用 $filter 只查這一條，不下載全縣市 Shape。"""
        city_code = normalize_city(city)
        city_scope = f"City/{city_code}"
        escaped_route_id = route_id.replace("'", "''")
        shapes = self._cache.get(
            f"bus-shape:{city_code}:{route_id}:{direction}",
            self._ttl_seconds,
            self._stale_seconds,
            lambda: self._client.fetch_bus_data(
                "Shape",
                city_scope,
                filter_expr=(
                    f"RouteUID eq '{escaped_route_id}' and Direction eq {direction}"
                ),
                select="RouteUID,RouteName,Direction,Geometry,UpdateTime",
            ),
        )
        shape = normalize_route_shape(shapes, route_id, direction)
        if shape is None:
            raise RouteShapeNotFoundError(
                f"route shape not found: {route_id} direction={direction}"
            )
        return {"city": city_code, **shape}
