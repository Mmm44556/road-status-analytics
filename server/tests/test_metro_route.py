import unittest

import requests
from fastapi import HTTPException, Response

from server.api.routes.metro import get_metro, get_metro_station
from server.services.metro_service import StationNotFoundError
from server.services.road_event_service import UnsupportedCityError


class FakeMetroService:
    def __init__(self, result=None, error=None):
        self.result = result
        self.error = error

    def get_city_metro_stations(self, city):
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


class MetroRouteTests(unittest.TestCase):
    def test_returns_merged_stations_with_data_source_header(self):
        response = Response()
        service = FakeMetroService({
            "city": "Kaohsiung",
            "stations": [{
                "stationId": "KRTC-O1",
                "name": "哈瑪星",
                "system": "捷運",
                "positionLon": 120.274508,
                "positionLat": 22.621492,
                "nextTrains": [{"direction": "往大寮", "estimateMinutes": 2}],
            }],
        })

        result = get_metro(response, "高雄市", service)

        self.assertEqual(service.city, "高雄市")
        self.assertEqual(result.data.stations[0]["stationId"], "KRTC-O1")
        self.assertEqual(response.headers["x-data-source"], "TDX")

    def test_rejects_unsupported_city(self):
        response = Response()
        service = FakeMetroService(error=UnsupportedCityError("nope"))

        with self.assertRaises(HTTPException) as context:
            get_metro(response, "火星市", service)

        self.assertEqual(context.exception.status_code, 422)

    def test_wraps_upstream_failure_as_bad_gateway(self):
        response = Response()
        service = FakeMetroService(error=requests.RequestException("boom"))

        with self.assertRaises(HTTPException) as context:
            get_metro(response, "高雄市", service)

        self.assertEqual(context.exception.status_code, 502)


class MetroStationRouteTests(unittest.TestCase):
    def test_returns_single_station_with_data_source_header(self):
        response = Response()
        service = FakeMetroService({
            "stationId": "KRTC-O1",
            "name": "哈瑪星",
            "system": "捷運",
            "nextTrains": [{"direction": "往大寮", "estimateMinutes": 2}],
        })

        result = get_metro_station("KRTC-O1", response, "高雄市", service)

        self.assertEqual(service.station_id, "KRTC-O1")
        self.assertEqual(result.data["stationId"], "KRTC-O1")
        self.assertEqual(response.headers["x-data-source"], "TDX")

    def test_returns_404_when_station_is_unknown(self):
        response = Response()
        service = FakeMetroService(error=StationNotFoundError("nope"))

        with self.assertRaises(HTTPException) as context:
            get_metro_station("does-not-exist", response, "高雄市", service)

        self.assertEqual(context.exception.status_code, 404)

    def test_wraps_upstream_failure_as_bad_gateway(self):
        response = Response()
        service = FakeMetroService(error=requests.RequestException("boom"))

        with self.assertRaises(HTTPException) as context:
            get_metro_station("KRTC-O1", response, "高雄市", service)

        self.assertEqual(context.exception.status_code, 502)


if __name__ == "__main__":
    unittest.main()
