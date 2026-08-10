import unittest

from server.traffic.tdx_service import RoadEventService, UnsupportedCityError, normalize_city


class FakeClient:
    def __init__(self):
        self.calls = []

    def fetch_city_events(self, city, *, live, top):
        self.calls.append((city, live, top))
        return {"LiveEvents" if live else "Events": [{"EventID": str(len(self.calls))}]}


class RoadEventServiceTests(unittest.TestCase):
    def test_normalizes_traditional_chinese_city_names(self):
        self.assertEqual(normalize_city("台中市"), "Taichung")
        self.assertEqual(normalize_city("臺北市"), "Taipei")

    def test_rejects_unknown_city_instead_of_forwarding_untrusted_path(self):
        with self.assertRaises(UnsupportedCityError):
            normalize_city("../../token")

    def test_returns_preview_and_live_events_from_cache_within_ttl(self):
        client = FakeClient()
        service = RoadEventService(client, ttl_seconds=60, clock=lambda: 1_000)

        first = service.get_city_events("臺中市", top=20)
        second = service.get_city_events("臺中市", top=20)

        self.assertEqual(first, second)
        self.assertEqual(first["city"], "Taichung")
        self.assertEqual(len(client.calls), 2)


if __name__ == "__main__":
    unittest.main()
