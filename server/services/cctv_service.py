from __future__ import annotations

import socket
import time
from ipaddress import ip_address
from typing import Any, Callable
from urllib.parse import urlsplit

from server.clients.tdx_client import TdxClient
from server.services.coordinated_ttl_cache import CoordinatedTtlCache
from server.services.road_event_service import normalize_city


def _hostname_resolves_to_public_address(hostname: str) -> bool:
    """檢查主機名稱（含 DNS 名稱）是否只解析到公開位址，避免 SSRF 存取內網。"""
    try:
        address = ip_address(hostname)
    except ValueError:
        try:
            resolved = socket.getaddrinfo(hostname, None)
        except socket.gaierror:
            return False
        addresses = {ip_address(info[4][0]) for info in resolved}
        return bool(addresses) and all(addr.is_global for addr in addresses)
    return address.is_global


class CctvService:
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

    def get_city_cctv(self, city: str, *, top: int) -> dict[str, Any]:
        city_code = normalize_city(city)
        cache_key = f"cctv:{city_code}:{top}"
        # TDX 的 CCTV 清單每 6 小時才更新一次，長 TTL 可避免無謂請求與觸發配額限制。
        def load_cctv() -> dict[str, Any]:
            payload = self._client.fetch_city_cctv(city_code, top=top)
            return {"city": city_code, "cctvs": payload.get("CCTVs", [])}

        return self._cache.get(
            cache_key,
            self._ttl_seconds,
            self._stale_seconds,
            load_cctv,
        )

    def get_camera_stream_url(self, city: str, camera_id: str, *, top: int) -> str:
        cameras = self.get_city_cctv(city, top=top)["cctvs"]
        camera = next(
            (item for item in cameras if item.get("CCTVID") == camera_id),
            None,
        )
        if camera is None:
            raise LookupError("CCTV camera not found")

        stream_url = camera.get("VideoStreamURL", "")
        parsed = urlsplit(stream_url)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            raise ValueError("CCTV stream URL is not allowed")
        # 主機名稱可能是 DNS 名稱，需實際解析後檢查位址，避免只驗證字面 IP
        # 而放行指向內網（例如雲端 metadata 服務）的名稱造成 SSRF。
        if not _hostname_resolves_to_public_address(parsed.hostname):
            raise ValueError("CCTV stream address is not public")
        return stream_url

    def open_camera_stream(self, city: str, camera_id: str, *, top: int) -> Any:
        stream_url = self.get_camera_stream_url(city, camera_id, top=top)
        return self._client.fetch_cctv_stream(stream_url)
