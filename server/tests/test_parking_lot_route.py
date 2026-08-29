import unittest

import requests
from fastapi import HTTPException, Response

from server.api.routes.parking_lot import get_parking_lot, get_parking_lots
from server.services.parking_lot_service import LotNotFoundError
from server.services.road_event_service import UnsupportedCityError


class FakeParkingLotService:
    def __init__(self, result=None, error=None):
        self.result = result
        self.error = error

    def get_city_parking_lots(self, city):
        self.city = city
        if self.error:
            raise self.error
        return self.result

    def get_single_lot(self, city, lot_id):
        self.city = city
        self.lot_id = lot_id
        if self.error:
            raise self.error
        return self.result


class ParkingLotsRouteTests(unittest.TestCase):
    def test_returns_merged_lots_with_data_source_header(self):
        response = Response()
        service = FakeParkingLotService({
            "city": "Kaohsiung",
            "lots": [{
                "lotId": "KHA00001",
                "name": "五都重平站停車場",
                "address": "高雄市前鎮區鎮中路、翠亨北路口",
                "positionLon": 120.32149,
                "positionLat": 22.58779,
                "fareDescription": "計次15元/次",
                "isMotorcycle": False,
                "totalSpaces": 54,
                "availableSpaces": 15,
                "serviceStatus": 1,
                "updateTime": "2026-08-29T23:03:08+08:00",
            }],
        })

        result = get_parking_lots(response, "高雄市", service)

        self.assertEqual(service.city, "高雄市")
        self.assertEqual(result.data.lots[0]["lotId"], "KHA00001")
        self.assertEqual(response.headers["x-data-source"], "TDX")

    def test_rejects_unsupported_city(self):
        response = Response()
        service = FakeParkingLotService(error=UnsupportedCityError("nope"))

        with self.assertRaises(HTTPException) as context:
            get_parking_lots(response, "火星市", service)

        self.assertEqual(context.exception.status_code, 422)

    def test_wraps_upstream_failure_as_bad_gateway(self):
        response = Response()
        service = FakeParkingLotService(error=requests.RequestException("boom"))

        with self.assertRaises(HTTPException) as context:
            get_parking_lots(response, "高雄市", service)

        self.assertEqual(context.exception.status_code, 502)


class ParkingLotRouteTests(unittest.TestCase):
    def test_returns_single_lot_with_data_source_header(self):
        response = Response()
        service = FakeParkingLotService({
            "lotId": "KHA00001",
            "name": "五都重平站停車場",
            "availableSpaces": 15,
        })

        result = get_parking_lot("KHA00001", response, "高雄市", service)

        self.assertEqual(service.lot_id, "KHA00001")
        self.assertEqual(result.data["lotId"], "KHA00001")
        self.assertEqual(response.headers["x-data-source"], "TDX")

    def test_returns_404_when_lot_is_unknown(self):
        response = Response()
        service = FakeParkingLotService(error=LotNotFoundError("nope"))

        with self.assertRaises(HTTPException) as context:
            get_parking_lot("does-not-exist", response, "高雄市", service)

        self.assertEqual(context.exception.status_code, 404)

    def test_wraps_upstream_failure_as_bad_gateway(self):
        response = Response()
        service = FakeParkingLotService(error=requests.RequestException("boom"))

        with self.assertRaises(HTTPException) as context:
            get_parking_lot("KHA00001", response, "高雄市", service)

        self.assertEqual(context.exception.status_code, 502)


if __name__ == "__main__":
    unittest.main()
