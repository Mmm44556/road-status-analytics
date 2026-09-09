import unittest

import requests
from fastapi import HTTPException, Response

from server.api.routes.vd import get_vd, get_vd_reading
from server.services.road_event_service import UnsupportedCityError
from server.services.vd_service import VdNotFoundError


class FakeVdService:
    def __init__(self, result=None, error=None):
        self.result = result
        self.error = error

    def get_city_vds(self, city):
        self.city = city
        if self.error:
            raise self.error
        return self.result

    def get_single_vd(self, city, vd_id):
        self.city = city
        self.vd_id = vd_id
        if self.error:
            raise self.error
        return self.result


class VdRouteTests(unittest.TestCase):
    def test_returns_merged_vds_with_data_source_header(self):
        response = Response()
        service = FakeVdService({
            "city": "Kaohsiung",
            "vds": [{
                "vdId": "V000241",
                "positionLon": 120.3202,
                "positionLat": 22.68382,
                "roadName": "民族一路",
                "roadSection": {"start": "華夏路(南)", "end": "重愛路(南)"},
                "links": [{
                    "linkId": "6196780000010E", "roadDirection": "N",
                    "laneCount": 2, "averageSpeed": 42.0, "averageOccupancy": 5.0,
                }],
            }],
        })

        result = get_vd(response, "高雄市", service)

        self.assertEqual(service.city, "高雄市")
        self.assertEqual(result.data.vds[0]["vdId"], "V000241")
        self.assertEqual(response.headers["x-data-source"], "TDX")

    def test_rejects_unsupported_city(self):
        response = Response()
        service = FakeVdService(error=UnsupportedCityError("nope"))

        with self.assertRaises(HTTPException) as context:
            get_vd(response, "火星市", service)

        self.assertEqual(context.exception.status_code, 422)


class VdReadingRouteTests(unittest.TestCase):
    def test_returns_single_vd_with_data_source_header(self):
        response = Response()
        service = FakeVdService({
            "vdId": "V000241",
            "positionLon": 120.3202,
            "positionLat": 22.68382,
            "links": [],
        })

        result = get_vd_reading("V000241", response, "高雄市", service)

        self.assertEqual(service.vd_id, "V000241")
        self.assertEqual(result.data["vdId"], "V000241")
        self.assertEqual(response.headers["x-data-source"], "TDX")

    def test_returns_404_when_vd_is_unknown(self):
        response = Response()
        service = FakeVdService(error=VdNotFoundError("nope"))

        with self.assertRaises(HTTPException) as context:
            get_vd_reading("does-not-exist", response, "高雄市", service)

        self.assertEqual(context.exception.status_code, 404)

    def test_wraps_upstream_failure_as_bad_gateway(self):
        response = Response()
        service = FakeVdService(error=requests.RequestException("boom"))

        with self.assertRaises(HTTPException) as context:
            get_vd_reading("V000241", response, "高雄市", service)

        self.assertEqual(context.exception.status_code, 502)


if __name__ == "__main__":
    unittest.main()
