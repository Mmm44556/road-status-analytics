import unittest

from fastapi import HTTPException

from server.api.routes.system import get_cache_stats
from server.observability.metrics import MetricsCollector


class SystemStatsRouteTests(unittest.TestCase):
    def test_returns_snapshot_when_enabled(self):
        metrics = MetricsCollector(started_at="2026-09-01T12:00:00+00:00")
        metrics.increment_tdx("cctv", "requests")

        result = get_cache_stats(metrics=metrics, enabled=True)

        self.assertEqual(result.startedAt, "2026-09-01T12:00:00+00:00")
        self.assertEqual(result.tdx.total.requests, 1)

    def test_returns_not_found_when_disabled(self):
        with self.assertRaises(HTTPException) as context:
            get_cache_stats(metrics=MetricsCollector(), enabled=False)

        self.assertEqual(context.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
