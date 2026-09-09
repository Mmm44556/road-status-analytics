import unittest

from server.observability.metrics import MetricsCollector


class MetricsCollectorTests(unittest.TestCase):
    def test_returns_totals_and_bounded_resource_breakdown(self):
        metrics = MetricsCollector(started_at="2026-09-01T12:00:00+00:00")

        metrics.increment_cache("vd-live:Kaohsiung", "freshHits")
        metrics.increment_cache("vd-live:Taipei", "misses")
        metrics.increment_tdx("road-traffic", "requests")
        metrics.increment_tdx("road-traffic", "successes")

        snapshot = metrics.snapshot()

        self.assertEqual(snapshot["startedAt"], "2026-09-01T12:00:00+00:00")
        self.assertEqual(snapshot["cache"]["total"]["freshHits"], 1)
        self.assertEqual(snapshot["cache"]["total"]["misses"], 1)
        self.assertEqual(snapshot["cache"]["byResource"]["vd-live"]["misses"], 1)
        self.assertEqual(snapshot["tdx"]["total"]["requests"], 1)

    def test_rejects_unknown_metric_names(self):
        metrics = MetricsCollector()

        with self.assertRaises(ValueError):
            metrics.increment_cache("vd-live", "unknown")


if __name__ == "__main__":
    unittest.main()
