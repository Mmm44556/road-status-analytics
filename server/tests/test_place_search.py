import unittest

from fastapi import Response

from server.api.routes.places import search_places
from server.clients.geoapify_client import GeoapifyClient
from server.services.place_search_service import PlaceSearchService


class FakeResponse:
    def raise_for_status(self):
        return None

    def json(self):
        return {"results": [{
            "place_id": "place-123",
            "name": "高雄車站",
            "formatted": "臺灣高雄市三民區建國二路318號",
            "lon": 120.302,
            "lat": 22.6397,
            "result_type": "amenity",
        }]}


class FakeSession:
    def __init__(self):
        self.calls = []

    def get(self, url, *, params, headers, timeout):
        self.calls.append((url, params, headers, timeout))
        return FakeResponse()


class PlaceSearchTests(unittest.TestCase):
    def test_client_limits_search_to_taiwan_and_maps_result(self):
        session = FakeSession()
        client = GeoapifyClient("api-key", session=session)

        results = client.search("高雄車站", limit=5)

        self.assertEqual(results[0]["name"], "高雄車站")
        self.assertEqual(results[0]["longitude"], 120.302)
        self.assertEqual(results[0]["source"], "Geoapify")
        self.assertEqual(session.calls[0][1]["filter"], "countrycode:tw")
        self.assertEqual(session.calls[0][1]["limit"], 5)

    def test_service_prefixes_bare_query_with_the_selected_city(self):
        class FakeClient:
            def search(self, query, *, limit):
                self.received_query = query
                return []

        client = FakeClient()
        service = PlaceSearchService(client, ttl_seconds=60, clock=lambda: 100)

        service.search("正修科技大學", city="高雄市", limit=5)

        self.assertEqual(client.received_query, "高雄市正修科技大學")

    def test_service_does_not_prefix_a_query_that_already_names_another_city(self):
        # 使用者先選了臺北市，但問的是高雄的地址；不應該疊加成「臺北市高雄市正修科技大學」。
        class FakeClient:
            def search(self, query, *, limit):
                self.received_query = query
                return []

        client = FakeClient()
        service = PlaceSearchService(client, ttl_seconds=60, clock=lambda: 100)

        service.search("高雄市正修科技大學", city="臺北市", limit=5)

        self.assertEqual(client.received_query, "高雄市正修科技大學")

    def test_service_caches_identical_queries(self):
        class FakeClient:
            def __init__(self):
                self.calls = 0

            def search(self, query, *, limit):
                self.calls += 1
                return [{"id": "1", "name": query}]

        client = FakeClient()
        service = PlaceSearchService(client, ttl_seconds=60, clock=lambda: 100)

        first = service.search(" 高雄車站 ", city="高雄市", limit=5)
        second = service.search("高雄車站", city="高雄市", limit=5)

        self.assertEqual(first, second)
        self.assertEqual(client.calls, 1)

    def test_route_returns_normalized_response_and_source_header(self):
        class FakeService:
            def search(self, query, *, city, limit):
                self.args = (query, city, limit)
                return [{
                    "id": "geoapify-place-123",
                    "name": "高雄車站",
                    "address": "高雄車站, 高雄市",
                    "longitude": 120.302,
                    "latitude": 22.6397,
                    "type": "station",
                    "source": "Geoapify",
                }]

        service = FakeService()
        response = Response()

        payload = search_places(
            response=response,
            q="高雄車站",
            city="高雄市",
            limit=5,
            service=service,
        )

        self.assertEqual(payload.data[0].name, "高雄車站")
        self.assertEqual(service.args, ("高雄車站", "高雄市", 5))
        self.assertEqual(response.headers["X-Data-Source"], "Geoapify")


if __name__ == "__main__":
    unittest.main()
