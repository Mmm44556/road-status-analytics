import unittest

from fastapi import Response

from server.api.routes.live_traffic import get_live_traffic


class FakeLiveTrafficService:
    def get_city_live_traffic(self, city):
        self.city = city
        return {
            "city": "Kaohsiung",
            "updatedAt": "2026-08-29T18:00:00+08:00",
            "segments": [{
                "sectionId": "section-1",
                "roadName": "台17線",
                "sectionName": "台17線測試路段",
                "roadDirection": "S",
                "coordinates": [[120.3, 22.6], [120.31, 22.61]],
                "travelSpeed": 28,
                "travelTime": 60,
                "congestionLevel": 3,
                "dataCollectTime": "2026-08-29T18:00:00+08:00",
                "source": "Highway",
            }],
        }


class LiveTrafficRouteTests(unittest.TestCase):
    def test_returns_normalized_segments_with_cache_headers(self):
        response = Response()
        service = FakeLiveTrafficService()

        result = get_live_traffic(response, "高雄市", service)

        self.assertEqual(service.city, "高雄市")
        self.assertEqual(result.data.segments[0].roadName, "台17線")
        self.assertEqual(response.headers["cache-control"], "public, max-age=30")
        self.assertEqual(response.headers["x-data-source"], "TDX")


if __name__ == "__main__":
    unittest.main()
