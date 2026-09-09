from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from threading import Lock


CACHE_METRICS = (
    "freshHits",
    "staleHits",
    "misses",
    "refreshSuccesses",
    "refreshFailures",
)
TDX_METRICS = (
    "requests",
    "successes",
    "retries",
    "rateLimited",
    "serverErrors",
    "failures",
)


def _empty_counts(names: tuple[str, ...]) -> dict[str, int]:
    return {name: 0 for name in names}


class MetricsCollector:
    """記錄低基數、程序內的快取與 TDX 累計值。"""

    def __init__(self, *, started_at: str | None = None) -> None:
        self._started_at = started_at or datetime.now(timezone.utc).isoformat()
        self._cache = defaultdict(lambda: _empty_counts(CACHE_METRICS))
        self._tdx = defaultdict(lambda: _empty_counts(TDX_METRICS))
        self._lock = Lock()

    def increment_cache(self, cache_key: str, metric: str) -> None:
        if metric not in CACHE_METRICS:
            raise ValueError(f"Unknown cache metric: {metric}")
        resource = cache_key.split(":", 1)[0]
        with self._lock:
            self._cache[resource][metric] += 1

    def increment_tdx(self, resource: str, metric: str) -> None:
        if metric not in TDX_METRICS:
            raise ValueError(f"Unknown TDX metric: {metric}")
        with self._lock:
            self._tdx[resource][metric] += 1

    def snapshot(self) -> dict:
        with self._lock:
            cache_by_resource = {
                resource: dict(counts) for resource, counts in self._cache.items()
            }
            tdx_by_resource = {
                resource: dict(counts) for resource, counts in self._tdx.items()
            }
        return {
            "startedAt": self._started_at,
            "cache": self._group_snapshot(CACHE_METRICS, cache_by_resource),
            "tdx": self._group_snapshot(TDX_METRICS, tdx_by_resource),
        }

    @staticmethod
    def _group_snapshot(names: tuple[str, ...], resources: dict) -> dict:
        total = _empty_counts(names)
        for counts in resources.values():
            for name in names:
                total[name] += counts[name]
        return {"total": total, "byResource": resources}
