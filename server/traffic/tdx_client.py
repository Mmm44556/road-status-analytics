from __future__ import annotations

import time
from typing import Any, Callable


TOKEN_URL = "https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token"
API_BASE_URL = "https://tdx.transportdata.tw/api/basic/v1/Traffic/RoadEvent"


class TdxConfigError(RuntimeError):
    pass


class TdxClient:
    def __init__(
        self,
        client_id: str,
        client_secret: str,
        session: Any | None = None,
        clock: Callable[[], float] = time.time,
        timeout: float = 15,
    ) -> None:
        if not client_id or not client_secret:
            raise TdxConfigError("TDX credentials are not configured")

        self._client_id = client_id
        self._client_secret = client_secret
        if session is None:
            import requests

            session = requests.Session()
        self._session = session
        self._clock = clock
        self._timeout = timeout
        self._access_token: str | None = None
        self._token_expires_at = 0.0

    def fetch_city_events(self, city: str, *, live: bool, top: int) -> dict[str, Any]:
        event_kind = "LiveEvent" if live else "Event"
        response = self._session.get(
            f"{API_BASE_URL}/{event_kind}/City/{city}",
            headers={"Authorization": f"Bearer {self._get_access_token()}"},
            params={"$top": top, "$format": "JSON"},
            timeout=self._timeout,
        )
        response.raise_for_status()
        return response.json()

    def _get_access_token(self) -> str:
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
        self._token_expires_at = now + max(int(payload.get("expires_in", 300)) - 30, 1)
        return self._access_token
