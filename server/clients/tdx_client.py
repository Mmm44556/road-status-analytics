from __future__ import annotations

import random
import time
from threading import Lock
from typing import Any, Callable

import requests

from server.observability.metrics import MetricsCollector


TOKEN_URL = "https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token"
ROAD_EVENT_API_URL = "https://tdx.transportdata.tw/api/basic/v1/Traffic/RoadEvent"
CCTV_API_URL = "https://tdx.transportdata.tw/api/basic/v2/Road/Traffic/CCTV"
ROAD_TRAFFIC_API_URL = "https://tdx.transportdata.tw/api/basic/v2/Road/Traffic"
BIKE_API_URL = "https://tdx.transportdata.tw/api/basic/v2/Bike"
BUS_API_URL = "https://tdx.transportdata.tw/api/basic/v2/Bus"
RAIL_METRO_API_URL = "https://tdx.transportdata.tw/api/basic/v2/Rail/Metro"
PARKING_API_URL = "https://tdx.transportdata.tw/api/basic/v1/Parking"


class TdxConfigError(RuntimeError):
    pass


def _create_cctv_stream_session() -> Any:
    import ssl
    import requests
    from requests.adapters import HTTPAdapter

    class CctvTlsAdapter(HTTPAdapter):
        def init_poolmanager(self, *args: Any, **kwargs: Any) -> None:
            context = ssl.create_default_context()
            # 部分政府 CCTV 憑證缺少 SKI；保留 CA 與 hostname 驗證，只關閉 X.509 strict。
            if hasattr(ssl, "VERIFY_X509_STRICT"):
                context.verify_flags &= ~ssl.VERIFY_X509_STRICT
            kwargs["ssl_context"] = context
            super().init_poolmanager(*args, **kwargs)

    session = requests.Session()
    session.mount("https://", CctvTlsAdapter())
    return session


class TdxClient:
    def __init__(
        self,
        client_id: str,
        client_secret: str,
        session: Any | None = None,
        clock: Callable[[], float] = time.time,
        timeout: float = 15,
        max_retries: int = 2,
        sleeper: Callable[[float], None] = time.sleep,
        random_fn: Callable[[], float] | None = None,
        metrics: MetricsCollector | None = None,
    ) -> None:
        if not client_id or not client_secret:
            raise TdxConfigError("TDX credentials are not configured")

        if session is None:
            session = requests.Session()
            stream_session = _create_cctv_stream_session()
        else:
            stream_session = session

        self._client_id = client_id
        self._client_secret = client_secret
        self._session = session
        self._stream_session = stream_session
        self._clock = clock
        self._timeout = timeout
        self._max_retries = max_retries
        self._sleeper = sleeper
        self._random_fn = random_fn or random.random
        self._metrics = metrics or MetricsCollector()
        self._access_token: str | None = None
        self._token_expires_at = 0.0
        self._token_lock = Lock()

    def fetch_city_events(self, city: str, *, live: bool, top: int) -> dict[str, Any]:
        event_kind = "LiveEvent" if live else "Event"
        return self._get_json(
            f"{ROAD_EVENT_API_URL}/{event_kind}/City/{city}",
            params={"$top": top, "$format": "JSON"},
            resource="road-events",
        )

    def fetch_city_cctv(self, city: str, *, top: int) -> dict[str, Any]:
        return self._get_json(
            f"{CCTV_API_URL}/City/{city}",
            params={"$top": top, "$format": "JSON"},
            resource="cctv",
        )

    def fetch_road_traffic(
        self, resource: str, scope: str, *, filter_expr: str | None = None
    ) -> dict[str, Any]:
        # filter_expr 是 OData $filter 表達式，用於單點刷新等只需要一筆資料的場景，
        # 避免為了一個點重新拉整批資料。
        params: dict[str, Any] = {"$format": "JSON"}
        if filter_expr:
            params["$filter"] = filter_expr
        return self._get_json(
            f"{ROAD_TRAFFIC_API_URL}/{resource}/{scope}",
            params=params,
            resource="road-traffic",
        )

    def fetch_bike_data(
        self, resource: str, scope: str, *, filter_expr: str | None = None
    ) -> list[dict[str, Any]]:
        # Bike 系列 API 直接回傳陣列，不像 Road/Traffic 系列包在具名欄位底下。
        # filter_expr 是 OData $filter 表達式，用於單點刷新等只需要一筆資料的場景，
        # 避免為了一個點重新拉整批資料。
        params: dict[str, Any] = {"$format": "JSON"}
        if filter_expr:
            params["$filter"] = filter_expr
        return self._get_json(
            f"{BIKE_API_URL}/{resource}/{scope}",
            params=params,
            resource="bike",
        )

    def fetch_bus_data(
        self,
        resource: str,
        scope: str,
        *,
        filter_expr: str | None = None,
        select: str | None = None,
    ) -> list[dict[str, Any]]:
        """取得市區公車資料，支援 OData 欄位與單站條件查詢。"""
        params: dict[str, Any] = {"$format": "JSON"}
        if select:
            params["$select"] = select
        elif resource == "Stop":
            params["$select"] = (
                "StopUID,StopID,StationID,StopName,StopAddress,StopPosition,UpdateTime"
            )
        if filter_expr:
            params["$filter"] = filter_expr
        return self._get_json(
            f"{BUS_API_URL}/{resource}/{scope}",
            params=params,
            resource="bus",
        )

    def fetch_metro_data(
        self, resource: str, operator: str, *, filter_expr: str | None = None
    ) -> list[dict[str, Any]]:
        # Rail/Metro 系列 API 依營運單位代碼（例如 KRTC、KLRT）查詢，不是依城市，
        # 且跟 Bike 系列一樣直接回傳陣列。filter_expr 是 OData $filter 表達式，
        # 用於單點刷新等只需要一筆資料的場景，避免為了一個點重新拉整批資料。
        params: dict[str, Any] = {"$format": "JSON"}
        if filter_expr:
            params["$filter"] = filter_expr
        return self._get_json(
            f"{RAIL_METRO_API_URL}/{resource}/{operator}",
            params=params,
            resource="metro",
        )

    def fetch_parking_data(
        self, resource: str, scope: str, *, filter_expr: str | None = None
    ) -> dict[str, Any]:
        # Parking 系列是 v1、dict 包裹回應（跟 Road/Traffic 系列同款，不是 Bike/Metro
        # 那種裸陣列）。filter_expr 是 OData $filter 表達式，用於單點刷新。
        params: dict[str, Any] = {"$format": "JSON"}
        if filter_expr:
            params["$filter"] = filter_expr
        return self._get_json(
            f"{PARKING_API_URL}/{resource}/{scope}",
            params=params,
            resource="parking",
        )

    def _get_json(
        self,
        url: str,
        *,
        params: dict[str, Any],
        resource: str,
    ) -> Any:
        """安全重試 TDX 的唯讀請求，避免 429 或暫時性錯誤放大到前端。"""
        retry_statuses = {429, 500, 502, 503, 504}
        for attempt in range(self._max_retries + 1):
            try:
                self._metrics.increment_tdx(resource, "requests")
                response = self._session.get(
                    url,
                    headers={"Authorization": f"Bearer {self._get_access_token()}"},
                    params=params,
                    timeout=self._timeout,
                )
                response.raise_for_status()
                payload = response.json()
                self._metrics.increment_tdx(resource, "successes")
                return payload
            except requests.RequestException as error:
                status_code = getattr(getattr(error, "response", None), "status_code", None)
                if status_code == 429:
                    self._metrics.increment_tdx(resource, "rateLimited")
                elif status_code is not None and 500 <= status_code < 600:
                    self._metrics.increment_tdx(resource, "serverErrors")
                can_retry = status_code is None or status_code in retry_statuses
                if not can_retry or attempt >= self._max_retries:
                    self._metrics.increment_tdx(resource, "failures")
                    raise

                self._metrics.increment_tdx(resource, "retries")
                retry_after = self._retry_after_seconds(getattr(error, "response", None))
                delay = retry_after
                if delay is None:
                    delay = 0.25 * (2**attempt) + self._random_fn() * 0.25
                self._sleeper(delay)

        raise RuntimeError("TDX retry loop exited unexpectedly")

    @staticmethod
    def _retry_after_seconds(response: Any | None) -> float | None:
        if response is None:
            return None
        raw_value = response.headers.get("Retry-After")
        try:
            value = float(raw_value)
        except (TypeError, ValueError):
            return None
        return min(max(value, 0.0), 30.0)

    def fetch_cctv_stream(self, stream_url: str) -> Any:
        # 不跟隨重新導向，避免受信任清單中的網址被轉向到非預期主機。
        response = self._stream_session.get(
            stream_url,
            timeout=self._timeout,
            stream=True,
            allow_redirects=False,
        )
        response.raise_for_status()
        return response

    def _get_access_token(self) -> str:
        now = self._clock()
        # Token 提前 30 秒失效，避免請求途中剛好過期。
        if self._access_token and now < self._token_expires_at:
            return self._access_token

        with self._token_lock:
            now = self._clock()
            if self._access_token and now < self._token_expires_at:
                return self._access_token

            response = self._session.post(
                TOKEN_URL,
                data={
                    "grant_type": "client_credentials",
                    "client_id": self._client_id,
                    "client_secret": self._client_secret,
                },
                timeout=self._timeout,
            )
            response.raise_for_status()
            payload = response.json()
            self._access_token = payload["access_token"]
            self._token_expires_at = now + max(
                int(payload.get("expires_in", 300)) - 30,
                1,
            )
            return self._access_token
