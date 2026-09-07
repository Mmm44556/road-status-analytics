from __future__ import annotations

import time
from collections import deque
from threading import Lock
from typing import Callable


class RateLimitExceededError(Exception):
    def __init__(self, retry_after_seconds: float) -> None:
        self.retry_after_seconds = retry_after_seconds
        super().__init__(f"Rate limit exceeded, retry after {retry_after_seconds:.0f}s")


class SlidingWindowRateLimiter:
    """依 key（例如來源 IP）限制單位時間內的請求次數，避免單一來源把外部 API 額度打爆。"""

    def __init__(
        self,
        *,
        max_requests: int,
        window_seconds: float,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._max_requests = max_requests
        self._window_seconds = window_seconds
        self._clock = clock
        self._hits: dict[str, deque[float]] = {}
        self._lock = Lock()

    def check(self, key: str) -> None:
        """超過限制時拋出 RateLimitExceededError；否則記錄這次請求。"""
        now = self._clock()
        with self._lock:
            hits = self._hits.setdefault(key, deque())
            while hits and now - hits[0] > self._window_seconds:
                hits.popleft()
            if len(hits) >= self._max_requests:
                retry_after = self._window_seconds - (now - hits[0])
                raise RateLimitExceededError(max(retry_after, 0.0))
            hits.append(now)
