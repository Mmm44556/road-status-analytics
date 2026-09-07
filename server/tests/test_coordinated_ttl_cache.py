import threading
import unittest
from concurrent.futures import ThreadPoolExecutor

from server.caching.backends import MemoryCacheBackend
from server.observability.metrics import MetricsCollector
from server.services.coordinated_ttl_cache import CoordinatedTtlCache


class CoordinatedTtlCacheTests(unittest.TestCase):
    def test_records_cache_outcomes_and_refresh_results(self):
        current_time = {"value": 1_000.0}
        metrics = MetricsCollector()
        cache = CoordinatedTtlCache(
            clock=lambda: current_time["value"],
            metrics=metrics,
        )

        cache.get("vd-live:Kaohsiung", 60, 300, lambda: "old")
        cache.get("vd-live:Kaohsiung", 60, 300, lambda: "unused")
        current_time["value"] += 61
        cache.get("vd-live:Kaohsiung", 60, 300, lambda: "new")
        cache.wait_for_refreshes()

        counts = metrics.snapshot()["cache"]["byResource"]["vd-live"]
        self.assertEqual(counts["misses"], 1)
        self.assertEqual(counts["freshHits"], 1)
        self.assertEqual(counts["staleHits"], 1)
        self.assertEqual(counts["refreshSuccesses"], 2)

    def test_multiple_cache_instances_share_the_same_backend(self):
        backend = MemoryCacheBackend(clock=lambda: 1_000)
        first_cache = CoordinatedTtlCache(backend=backend, clock=lambda: 1_000)
        second_cache = CoordinatedTtlCache(backend=backend, clock=lambda: 1_000)

        first_cache.get("cctv:Kaohsiung", 60, 300, lambda: "shared")
        result = second_cache.get(
            "cctv:Kaohsiung",
            60,
            300,
            lambda: self.fail("shared backend should satisfy the request"),
        )

        self.assertEqual(result, "shared")

    def test_coalesces_concurrent_cold_cache_loads(self):
        cache = CoordinatedTtlCache(clock=lambda: 1_000)
        loader_started = threading.Event()
        release_loader = threading.Event()
        calls = 0

        def loader():
            nonlocal calls
            calls += 1
            loader_started.set()
            release_loader.wait(timeout=1)
            return {"value": calls}

        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = [
                executor.submit(cache.get, "cctv:Kaohsiung", 60, 300, loader)
                for _ in range(4)
            ]
            self.assertTrue(loader_started.wait(timeout=1))
            release_loader.set()
            results = [future.result(timeout=1) for future in futures]

        self.assertEqual(results, [{"value": 1}] * 4)
        self.assertEqual(calls, 1)

    def test_returns_stale_value_while_one_background_refresh_runs(self):
        current_time = {"value": 1_000.0}
        cache = CoordinatedTtlCache(clock=lambda: current_time["value"])
        cache.get("vd-live:Kaohsiung", 60, 300, lambda: "old")
        current_time["value"] += 61
        refresh_started = threading.Event()
        release_refresh = threading.Event()

        def loader():
            refresh_started.set()
            release_refresh.wait(timeout=1)
            return "new"

        self.assertEqual(cache.get("vd-live:Kaohsiung", 60, 300, loader), "old")
        self.assertTrue(refresh_started.wait(timeout=1))
        self.assertEqual(cache.get("vd-live:Kaohsiung", 60, 300, loader), "old")
        release_refresh.set()
        cache.wait_for_refreshes()

        self.assertEqual(cache.get("vd-live:Kaohsiung", 60, 300, loader), "new")

    def test_keeps_stale_value_when_background_refresh_fails(self):
        current_time = {"value": 1_000.0}
        cache = CoordinatedTtlCache(clock=lambda: current_time["value"])
        cache.get("road-events:Kaohsiung", 60, 300, lambda: "old")
        current_time["value"] += 61

        self.assertEqual(
            cache.get(
                "road-events:Kaohsiung",
                60,
                300,
                lambda: (_ for _ in ()).throw(RuntimeError("TDX unavailable")),
            ),
            "old",
        )
        cache.wait_for_refreshes()

        self.assertEqual(
            cache.get("road-events:Kaohsiung", 60, 300, lambda: "recovered"),
            "old",
        )


if __name__ == "__main__":
    unittest.main()
