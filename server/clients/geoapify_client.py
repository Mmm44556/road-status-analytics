from __future__ import annotations

from typing import Any


GEOAPIFY_GEOCODING_URL = "https://api.geoapify.com/v1/geocode/search"
GEOAPIFY_ROUTING_URL = "https://api.geoapify.com/v1/routing"


class GeoapifyConfigError(RuntimeError):
    pass


class GeoapifyClient:
    """呼叫 Geoapify 地理編碼服務並轉成專案共用格式。"""

    def __init__(
        self,
        api_key: str,
        *,
        session: Any | None = None,
        timeout: float = 10,
    ) -> None:
        if not api_key:
            raise GeoapifyConfigError("Geoapify API key is not configured")
        if session is None:
            import requests

            session = requests.Session()
        self._api_key = api_key
        self._session = session
        self._timeout = timeout

    def search(self, query: str, *, limit: int) -> list[dict[str, Any]]:
        # Source: https://apidocs.geoapify.com/docs/geocoding/forward-geocoding/
        response = self._session.get(
            GEOAPIFY_GEOCODING_URL,
            params={
                "text": query,
                "filter": "countrycode:tw",
                "lang": "zh",
                "limit": limit,
                "format": "json",
                "apiKey": self._api_key,
            },
            headers={"Accept": "application/json"},
            timeout=self._timeout,
        )
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, dict) or not isinstance(payload.get("results"), list):
            raise ValueError("Invalid Geoapify response")
        return [self._normalize(item) for item in payload["results"]]

    def route(
        self,
        waypoints: list[tuple[float, float]],
        travel_mode: str,
    ) -> dict[str, Any]:
        # Source: https://apidocs.geoapify.com/docs/routing/
        waypoint_param = "|".join(
            f"{latitude},{longitude}" for longitude, latitude in waypoints
        )
        params = {
            "waypoints": waypoint_param,
            "mode": travel_mode,
            "format": "geojson",
            "apiKey": self._api_key,
        }
        if travel_mode == "drive":
            params["traffic"] = "approximated"
        if len(waypoints) > 2:
            params["intermediate_waypoint_mode"] = "stopover"
        response = self._session.get(
            GEOAPIFY_ROUTING_URL,
            params=params.copy(),
            headers={"Accept": "application/json"},
            timeout=self._timeout,
        )
        is_approximated = False
        if travel_mode == "transit" and getattr(response, "status_code", 200) == 400:
            params["mode"] = "approximated_transit"
            response = self._session.get(
                GEOAPIFY_ROUTING_URL,
                params=params.copy(),
                headers={"Accept": "application/json"},
                timeout=self._timeout,
            )
            is_approximated = True
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, dict) or not isinstance(payload.get("features"), list):
            raise ValueError("Invalid Geoapify route response")
        if not payload["features"]:
            raise ValueError("Geoapify route not found")
        route = self._normalize_route(payload["features"][0])
        route["travel_mode"] = travel_mode
        route["is_approximated"] = is_approximated
        return route

    @staticmethod
    def _normalize_route(feature: dict[str, Any]) -> dict[str, Any]:
        properties = feature.get("properties")
        geometry = feature.get("geometry")
        if not isinstance(properties, dict) or not isinstance(geometry, dict):
            raise ValueError("Invalid Geoapify route feature")
        if geometry.get("type") != "MultiLineString":
            raise ValueError("Invalid Geoapify route geometry")
        coordinates = geometry.get("coordinates")
        if not isinstance(coordinates, list) or not coordinates:
            raise ValueError("Invalid Geoapify route coordinates")
        return {
            "distance_meters": float(properties["distance"]),
            "duration_seconds": float(properties["time"]),
            "geometry": {
                "type": "MultiLineString",
                "coordinates": coordinates,
            },
            "source": "Geoapify",
        }

    @staticmethod
    def _normalize(item: dict[str, Any]) -> dict[str, Any]:
        place_id = str(item["place_id"])
        address = str(item["formatted"])
        name = item.get("name") or item.get("address_line1") or address
        longitude = float(item["lon"])
        latitude = float(item["lat"])
        if not (-180 <= longitude <= 180 and -90 <= latitude <= 90):
            raise ValueError("Invalid Geoapify coordinates")
        return {
            "id": f"geoapify-{place_id}",
            "name": str(name),
            "address": address,
            "longitude": longitude,
            "latitude": latitude,
            "type": str(item.get("result_type") or "place"),
            "source": "Geoapify",
        }
