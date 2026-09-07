import unittest
import requests

from server.clients.geoapify_client import GeoapifyClient, GeoapifyConfigError


class FakeResponse:
    def raise_for_status(self):
        return None

    def json(self):
        return {
            "results": [{
                "place_id": "place-123",
                "name": "高雄車站",
                "formatted": "臺灣高雄市三民區建國二路318號",
                "lon": 120.302,
                "lat": 22.6397,
                "result_type": "amenity",
            }],
        }


class FakeRouteResponse:
    def raise_for_status(self):
        return None

    def json(self):
        return {
            "type": "FeatureCollection",
            "features": [{
                "type": "Feature",
                "properties": {"distance": 4321, "time": 678},
                "geometry": {
                    "type": "MultiLineString",
                    "coordinates": [[[120.302, 22.6397], [120.31, 22.63]]],
                },
            }],
        }


class FakeSession:
    def __init__(self):
        self.calls = []

    def get(self, url, *, params, headers, timeout):
        self.calls.append((url, params, headers, timeout))
        if url.endswith("/routing"):
            return FakeRouteResponse()
        return FakeResponse()


class TransitFallbackSession(FakeSession):
    def get(self, url, *, params, headers, timeout):
        self.calls.append((url, params, headers, timeout))
        if params["mode"] == "transit":
            response = requests.Response()
            response.status_code = 400
            response._content = b'{"message":"No path could be found for input"}'
            return response
        return FakeRouteResponse()


class GeoapifyClientTests(unittest.TestCase):
    def test_requires_api_key(self):
        with self.assertRaises(GeoapifyConfigError):
            GeoapifyClient("")

    def test_searches_only_taiwan_and_normalizes_results(self):
        session = FakeSession()
        client = GeoapifyClient("api-key", session=session)

        results = client.search("高雄車站", limit=5)

        self.assertEqual(results[0]["id"], "geoapify-place-123")
        self.assertEqual(results[0]["name"], "高雄車站")
        self.assertEqual(results[0]["longitude"], 120.302)
        self.assertEqual(results[0]["source"], "Geoapify")
        self.assertEqual(session.calls[0][1]["filter"], "countrycode:tw")
        self.assertEqual(session.calls[0][1]["lang"], "zh")
        self.assertEqual(session.calls[0][1]["limit"], 5)
        self.assertEqual(session.calls[0][2], {"Accept": "application/json"})

    def test_calculates_driving_route_and_normalizes_geojson(self):
        session = FakeSession()
        client = GeoapifyClient("api-key", session=session)

        result = client.route(
            [
                (120.302, 22.6397),
                (120.305, 22.635),
                (120.31, 22.63),
            ],
            "drive",
        )

        self.assertEqual(result["distance_meters"], 4321)
        self.assertEqual(result["duration_seconds"], 678)
        self.assertEqual(result["travel_mode"], "drive")
        self.assertEqual(result["geometry"]["type"], "MultiLineString")
        self.assertEqual(session.calls[0][1]["mode"], "drive")
        self.assertEqual(session.calls[0][1]["traffic"], "approximated")
        self.assertEqual(
            session.calls[0][1]["waypoints"],
            "22.6397,120.302|22.635,120.305|22.63,120.31",
        )
        self.assertEqual(session.calls[0][1]["intermediate_waypoint_mode"], "stopover")

    def test_uses_requested_non_driving_mode_without_traffic(self):
        session = FakeSession()
        client = GeoapifyClient("api-key", session=session)

        client.route([(120.302, 22.6397), (120.31, 22.63)], "bicycle")

        self.assertEqual(session.calls[0][1]["mode"], "bicycle")
        self.assertNotIn("traffic", session.calls[0][1])

    def test_uses_transit_mode_without_driving_traffic(self):
        session = FakeSession()
        client = GeoapifyClient("api-key", session=session)

        result = client.route([(120.302, 22.6397), (120.31, 22.63)], "transit")

        self.assertEqual(result["travel_mode"], "transit")
        self.assertEqual(session.calls[0][1]["mode"], "transit")
        self.assertNotIn("traffic", session.calls[0][1])

    def test_falls_back_to_approximated_transit_when_no_exact_path_exists(self):
        session = TransitFallbackSession()
        client = GeoapifyClient("api-key", session=session)

        result = client.route([(120.302, 22.6397), (120.31, 22.63)], "transit")

        self.assertEqual([call[1]["mode"] for call in session.calls], [
            "transit",
            "approximated_transit",
        ])
        self.assertEqual(result["travel_mode"], "transit")
        self.assertTrue(result["is_approximated"])


if __name__ == "__main__":
    unittest.main()
