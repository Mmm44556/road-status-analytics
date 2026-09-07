from __future__ import annotations

import json
import logging
import math
import time
from dataclasses import dataclass
from threading import Lock
from typing import Any, Callable, Protocol


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class CacheEntry:
    fresh_until: float
    stale_until: float
    value: Any


class CacheBackend(Protocol):
    """快取儲存層契約；時間判斷仍由協調快取負責。"""

    def read(self, key: str) -> CacheEntry | None: ...

    def write(self, key: str, entry: CacheEntry) -> None: ...


class MemoryCacheBackend:
    def __init__(self, *, clock: Callable[[], float] = time.time) -> None:
        self._clock = clock
        self._entries: dict[str, CacheEntry] = {}
        self._lock = Lock()

    def read(self, key: str) -> CacheEntry | None:
        with self._lock:
            entry = self._entries.get(key)
            if entry and self._clock() < entry.stale_until:
                return entry
            self._entries.pop(key, None)
            return None

    def write(self, key: str, entry: CacheEntry) -> None:
        with self._lock:
            self._entries[key] = entry


class RedisCacheBackend:
    def __init__(
        self,
        redis_url: str,
        *,
        namespace: str = "roadmap:v1",
        client: Any | None = None,
        clock: Callable[[], float] = time.time,
    ) -> None:
        if client is None:
            from redis import Redis

            client = Redis.from_url(
                redis_url,
                decode_responses=True,
                socket_connect_timeout=1,
                socket_timeout=1,
            )
        self._client = client
        self._namespace = namespace.rstrip(":")
        self._clock = clock

    def read(self, key: str) -> CacheEntry | None:
        raw_value = self._client.get(self._redis_key(key))
        if raw_value is None:
            return None
        if isinstance(raw_value, bytes):
            raw_value = raw_value.decode("utf-8")
        try:
            payload = json.loads(raw_value)
            entry = CacheEntry(
                fresh_until=float(payload["freshUntil"]),
                stale_until=float(payload["staleUntil"]),
                value=payload["value"],
            )
        except (KeyError, TypeError, ValueError, json.JSONDecodeError):
            logger.warning("Ignored invalid Redis cache entry for %s", key)
            return None
        if self._clock() >= entry.stale_until:
            return None
        return entry

    def write(self, key: str, entry: CacheEntry) -> None:
        ttl_seconds = max(math.ceil(entry.stale_until - self._clock()), 1)
        payload = json.dumps(
            {
                "freshUntil": entry.fresh_until,
                "staleUntil": entry.stale_until,
                "value": entry.value,
            },
            ensure_ascii=False,
            separators=(",", ":"),
        )
        self._client.set(self._redis_key(key), payload, ex=ttl_seconds)

    def _redis_key(self, key: str) -> str:
        return f"{self._namespace}:{key}"


class FallbackCacheBackend:
    """Redis 無法使用時，保留程序內快取作為降級路徑。"""

    def __init__(
        self,
        primary: CacheBackend,
        fallback: CacheBackend,
        *,
        clock: Callable[[], float] = time.time,
        retry_after_seconds: int = 30,
    ) -> None:
        self._primary = primary
        self._fallback = fallback
        self._clock = clock
        self._retry_after_seconds = retry_after_seconds
        self._primary_disabled_until = 0.0
        self._lock = Lock()

    def read(self, key: str) -> CacheEntry | None:
        if not self._can_use_primary():
            return self._fallback.read(key)
        try:
            entry = self._primary.read(key)
        except Exception:
            self._disable_primary()
            logger.warning("Primary cache read failed for %s", key, exc_info=True)
            return self._fallback.read(key)
        return entry or self._fallback.read(key)

    def write(self, key: str, entry: CacheEntry) -> None:
        self._fallback.write(key, entry)
        if not self._can_use_primary():
            return
        try:
            self._primary.write(key, entry)
        except Exception:
            self._disable_primary()
            logger.warning("Primary cache write failed for %s", key, exc_info=True)

    def _can_use_primary(self) -> bool:
        with self._lock:
            return self._clock() >= self._primary_disabled_until

    def _disable_primary(self) -> None:
        with self._lock:
            self._primary_disabled_until = self._clock() + self._retry_after_seconds
