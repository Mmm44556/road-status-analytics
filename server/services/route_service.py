from typing import Any, Protocol

from server.schemas.route import RouteTravelMode


class RoutingProvider(Protocol):
    def route(
        self,
        waypoints: list[tuple[float, float]],
        travel_mode: str,
    ) -> dict[str, Any]: ...


class RouteService:
    """隔離路線供應商，維持 API 回應格式穩定。"""

    def __init__(self, client: RoutingProvider) -> None:
        self._client = client

    def calculate(
        self,
        waypoints: list[tuple[float, float]],
        travel_mode: RouteTravelMode,
    ) -> dict[str, Any]:
        return self._client.route(waypoints, travel_mode.value)
