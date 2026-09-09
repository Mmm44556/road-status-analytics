import unittest

from server.caching.backends import (
    CacheEntry,
    FallbackCacheBackend,
    MemoryCacheBackend,
    RedisCacheBackend,
)


class FakeRedis:
    def __init__(self):
        self.values = {}
        self.set_calls = []

    def get(self, key):
        return self.values.get(key)

    def set(self, key, value, *, ex):
        self.values[key] = value
        self.set_calls.append((key, value, ex))


class FailingBackend:
    def __init__(self):
        self.read_calls = 0
        self.write_calls = 0

    def read(self, key):
        self.read_calls += 1
        raise RuntimeError("Redis unavailable")

    def write(self, key, entry):
        self.write_calls += 1
        raise RuntimeError("Redis unavailable")


class CacheBackendTests(unittest.TestCase):
    def test_memory_backend_discards_entries_after_stale_deadline(self):
        current_time = {"value": 1_000.0}
        backend = MemoryCacheBackend(clock=lambda: current_time["value"])
        entry = CacheEntry(fresh_until=1_060, stale_until=1_120, value={"ok": True})

        backend.write("vd:Kaohsiung", entry)
        self.assertEqual(backend.read("vd:Kaohsiung"), entry)

        current_time["value"] = 1_121
        self.assertIsNone(backend.read("vd:Kaohsiung"))

    def test_redis_backend_uses_versioned_namespace_and_stale_ttl(self):
        redis = FakeRedis()
        backend = RedisCacheBackend(
            "redis://unused",
            namespace="roadmap:v1",
            client=redis,
            clock=lambda: 1_000,
        )
        entry = CacheEntry(
            fresh_until=1_060,
            stale_until=1_300,
            value={"city": "Kaohsiung"},
        )

        backend.write("vd:Kaohsiung", entry)
        restored = backend.read("vd:Kaohsiung")

        self.assertEqual(restored, entry)
        self.assertEqual(redis.set_calls[0][0], "roadmap:v1:vd:Kaohsiung")
        self.assertEqual(redis.set_calls[0][2], 300)

    def test_fallback_backend_keeps_serving_memory_when_primary_fails(self):
        memory = MemoryCacheBackend(clock=lambda: 1_000)
        primary = FailingBackend()
        backend = FallbackCacheBackend(primary, memory, clock=lambda: 1_000)
        entry = CacheEntry(fresh_until=1_060, stale_until=1_300, value="cached")

        backend.write("road-events:Kaohsiung", entry)

        self.assertEqual(backend.read("road-events:Kaohsiung"), entry)
        self.assertEqual(backend.read("road-events:Kaohsiung"), entry)
        self.assertEqual(primary.write_calls, 1)
        self.assertEqual(primary.read_calls, 0)


if __name__ == "__main__":
    unittest.main()
