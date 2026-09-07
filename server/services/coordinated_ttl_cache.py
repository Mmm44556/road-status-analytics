from __future__ import annotations

import logging
import time
from concurrent.futures import Future, ThreadPoolExecutor
from threading import Lock
from typing import Any, Callable

from server.caching.backends import CacheBackend, CacheEntry, MemoryCacheBackend
from server.observability.metrics import MetricsCollector


logger = logging.getLogger(__name__)


class CoordinatedTtlCache:
    """提供同請求合併與過期資料背景更新。"""

    def __init__(
        self,
        *,
        backend: CacheBackend | None = None,
        metrics: MetricsCollector | None = None,
        clock: Callable[[], float] = time.time,
        max_refresh_workers: int = 4,
    ) -> None:
        self._clock = clock
        self._backend = backend or MemoryCacheBackend(clock=clock)
        self._metrics = metrics or MetricsCollector()
        self._inflight: dict[str, Future[Any]] = {}
        self._lock = Lock()
        self._executor = ThreadPoolExecutor(
            max_workers=max_refresh_workers,
            thread_name_prefix="tdx-cache",
        )

    def get(
        self,
        key: str,
        ttl_seconds: int,
        stale_seconds: int,
        loader: Callable[[], Any],
    ) -> Any:
        """取得快取；冷啟動共用請求，過期時先回舊值並在背景更新。"""
        now = self._clock()
        entry = self._backend.read(key)
        if entry and now < entry.fresh_until:
            self._metrics.increment_cache(key, "freshHits")
            return entry.value

        with self._lock:
            future = self._inflight.get(key)
            if future is None:
                # 等待鎖期間其他請求可能已完成載入，建立工作前需再次確認。
                entry = self._backend.read(key)
                if entry and now < entry.fresh_until:
                    self._metrics.increment_cache(key, "freshHits")
                    return entry.value
                future = self._executor.submit(
                    self._refresh,
                    key,
                    ttl_seconds,
                    stale_seconds,
                    loader,
                )
                self._inflight[key] = future

            if entry and now < entry.stale_until:
                self._metrics.increment_cache(key, "staleHits")
                return entry.value

        # 冷快取沒有可回退資料時，共用同一個上游請求結果。
        self._metrics.increment_cache(key, "misses")
        return future.result()

    def wait_for_refreshes(self) -> None:
        """等待測試或關閉流程中的背景更新完成。"""
        while True:
            with self._lock:
                futures = tuple(self._inflight.values())
            if not futures:
                return
            for future in futures:
                try:
                    future.result()
                except Exception:
                    # 背景更新失敗已由 _refresh 記錄，舊資料仍保留。
                    pass

    def _refresh(
        self,
        key: str,
        ttl_seconds: int,
        stale_seconds: int,
        loader: Callable[[], Any],
    ) -> Any:
        try:
            value = loader()
            now = self._clock()
            self._backend.write(
                key,
                CacheEntry(
                    fresh_until=now + ttl_seconds,
                    stale_until=now + ttl_seconds + stale_seconds,
                    value=value,
                ),
            )
            self._metrics.increment_cache(key, "refreshSuccesses")
            return value
        except Exception:
            self._metrics.increment_cache(key, "refreshFailures")
            logger.warning("TDX cache refresh failed for %s", key, exc_info=True)
            raise
        finally:
            with self._lock:
                self._inflight.pop(key, None)
