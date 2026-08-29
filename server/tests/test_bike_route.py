import unittest

import requests
from fastapi import HTTPException, Response

from server.api.routes.bike import get_bike, get_bike_station
from server.services.bike_service import StationNotFoundError
from server.services.road_event_service import UnsupportedCityError


class FakeBikeService:
    def __init__(self, result=None, error=None):
        self.result = result
        self.error = error

    def get_city_bikes(self, city):
        self.city = city
        if self.error:
            raise self.error
        return self.result

    def get_single_station(self, city, station_id):
        self.city = city
        self.station_id = station_id
        if self.error:
            raise self.error
        return self.result


class BikeRouteTests(unittest.TestCase):
    def test_returns_merged_stations_with_data_source_header(self):
        response = Response()
        service = FakeBikeService({
            "city": "Kaohsiung",
            "stations": [{
                "stationId": "KHH501201001",
                "name": "捷運美麗島站(10號出口)",
                "address": "中山一路168號前方",
                "positionLon": 120.30212,
                "positionLat": 22.63213,
                "capacity": 23,
                "serviceStatus": 1,
                "availableRentBikes": 6,
                "availableReturnBikes": 16,
                "availableElectricBikes": 0,
            }],
        })

        result = get_bike(response, "高雄市", service)

        self.assertEqual(service.city, "高雄市")
        self.assertEqual(result.data.stations[0]["stationId"], "KHH501201001")
        self.assertEqual(response.headers["x-data-source"], "TDX")

    def test_rejects_unsupported_city(self):
        response = Response()
        service = FakeBikeService(error=UnsupportedCityError("nope"))

        with self.assertRaises(HTTPException) as context:
            get_bike(response, "火星市", service)

        self.assertEqual(context.exception.status_code, 422)


class BikeStationRouteTests(unittest.TestCase):
    def test_returns_single_station_with_data_source_header(self):
        response = Response()
        service = FakeBikeService({
            "stationId": "KHH501201001",
            "name": "捷運美麗島站(10號出口)",
            "availableRentBikes": 6,
        })

        result = get_bike_station("KHH501201001", response, "高雄市", service)

        self.assertEqual(service.station_id, "KHH501201001")
        self.assertEqual(result.data["stationId"], "KHH501201001")
        self.assertEqual(response.headers["x-data-source"], "TDX")

    def test_returns_404_when_station_is_unknown(self):
        response = Response()
        service = FakeBikeService(error=StationNotFoundError("nope"))

        with self.assertRaises(HTTPException) as context:
            get_bike_station("does-not-exist", response, "高雄市", service)

        self.assertEqual(context.exception.status_code, 404)

    def test_wraps_upstream_failure_as_bad_gateway(self):
        response = Response()
        service = FakeBikeService(error=requests.RequestException("boom"))

        with self.assertRaises(HTTPException) as context:
            get_bike_station("KHH501201001", response, "高雄市", service)

        self.assertEqual(context.exception.status_code, 502)


if __name__ == "__main__":
    unittest.main()
