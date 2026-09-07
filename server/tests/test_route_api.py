import unittest

from fastapi import Response

from server.api.routes.routes import calculate_route
from server.schemas.route import Coordinate, RouteRequest


class RouteApiTests(unittest.TestCase):
    def test_returns_normalized_route_and_source_header(self):
        class FakeService:
            def calculate(self, waypoints, travel_mode):
                self.args = waypoints
                self.travel_mode = travel_mode
                return {
                    "distance_meters": 4321,
                    "duration_seconds": 678,
                    "geometry": {
                        "type": "MultiLineString",
                        "coordinates": [[[120.302, 22.6397], [120.31, 22.63]]],
                    },
                    "travel_mode": travel_mode,
                    "source": "Geoapify",
                }

        service = FakeService()
        response = Response()
        request = RouteRequest(
            waypoints=[
                Coordinate(longitude=120.302, latitude=22.6397),
                Coordinate(longitude=120.305, latitude=22.635),
                Coordinate(longitude=120.31, latitude=22.63),
            ],
        )

        payload = calculate_route(request, response, service)

        self.assertEqual(payload.data.distance_meters, 4321)
        self.assertEqual(payload.data.geometry.type, "MultiLineString")
        self.assertEqual(response.headers["X-Data-Source"], "Geoapify")
        self.assertEqual(service.args[0], (120.302, 22.6397))
        self.assertEqual(service.args[1], (120.305, 22.635))
        self.assertEqual(service.travel_mode.value, "drive")

    def test_passes_requested_travel_mode_to_service(self):
        class FakeService:
            def calculate(self, waypoints, travel_mode):
                self.travel_mode = travel_mode
                return {
                    "distance_meters": 1,
                    "duration_seconds": 1,
                    "geometry": {
                        "type": "MultiLineString",
                        "coordinates": [[[120, 22], [121, 23]]],
                    },
                    "travel_mode": travel_mode,
                    "source": "Geoapify",
                }

        service = FakeService()
        request = RouteRequest(
            waypoints=[
                Coordinate(longitude=120, latitude=22),
                Coordinate(longitude=121, latitude=23),
            ],
            travel_mode="walk",
        )

        calculate_route(request, Response(), service)

        self.assertEqual(service.travel_mode.value, "walk")

    def test_accepts_transit_travel_mode(self):
        request = RouteRequest(
            waypoints=[
                Coordinate(longitude=120, latitude=22),
                Coordinate(longitude=121, latitude=23),
            ],
            travel_mode="transit",
        )

        self.assertEqual(request.travel_mode.value, "transit")


if __name__ == "__main__":
    unittest.main()
