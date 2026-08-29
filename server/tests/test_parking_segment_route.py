import unittest

import requests
from fastapi import HTTPException, Response

from server.api.routes.parking_segment import get_parking_segment, get_parking_segments
from server.services.parking_segment_service import SegmentNotFoundError
from server.services.road_event_service import UnsupportedCityError


class FakeParkingSegmentService:
    def __init__(self, result=None, error=None):
        self.result = result
        self.error = error

    def get_city_parking_segments(self, city):
        self.city = city
        if self.error:
            raise self.error
        return self.result

    def get_single_segment(self, city, segment_id):
        self.city = city
        self.segment_id = segment_id
        if self.error:
            raise self.error
        return self.result


class ParkingSegmentsRouteTests(unittest.TestCase):
    def test_returns_merged_segments_with_data_source_header(self):
        response = Response()
        service = FakeParkingSegmentService({
            "city": "Kaohsiung",
            "segments": [{
                "segmentId": "001",
                "name": "建軍路",
                "description": ".",
                "positionLon": 120.3042224,
                "positionLat": 22.6636242,
                "fareDescription": "半時計15",
                "totalSpaces": 33,
                "availableSpaces": 3,
                "serviceStatus": 1,
                "updateTime": "2026-08-29T23:02:05+08:00",
            }],
        })

        result = get_parking_segments(response, "高雄市", service)

        self.assertEqual(service.city, "高雄市")
        self.assertEqual(result.data.segments[0]["segmentId"], "001")
        self.assertEqual(response.headers["x-data-source"], "TDX")

    def test_rejects_unsupported_city(self):
        response = Response()
        service = FakeParkingSegmentService(error=UnsupportedCityError("nope"))

        with self.assertRaises(HTTPException) as context:
            get_parking_segments(response, "火星市", service)

        self.assertEqual(context.exception.status_code, 422)

    def test_wraps_upstream_failure_as_bad_gateway(self):
        response = Response()
        service = FakeParkingSegmentService(error=requests.RequestException("boom"))

        with self.assertRaises(HTTPException) as context:
            get_parking_segments(response, "高雄市", service)

        self.assertEqual(context.exception.status_code, 502)


class ParkingSegmentRouteTests(unittest.TestCase):
    def test_returns_single_segment_with_data_source_header(self):
        response = Response()
        service = FakeParkingSegmentService({
            "segmentId": "001",
            "name": "建軍路",
            "availableSpaces": 3,
        })

        result = get_parking_segment("001", response, "高雄市", service)

        self.assertEqual(service.segment_id, "001")
        self.assertEqual(result.data["segmentId"], "001")
        self.assertEqual(response.headers["x-data-source"], "TDX")

    def test_returns_404_when_segment_is_unknown(self):
        response = Response()
        service = FakeParkingSegmentService(error=SegmentNotFoundError("nope"))

        with self.assertRaises(HTTPException) as context:
            get_parking_segment("does-not-exist", response, "高雄市", service)

        self.assertEqual(context.exception.status_code, 404)

    def test_wraps_upstream_failure_as_bad_gateway(self):
        response = Response()
        service = FakeParkingSegmentService(error=requests.RequestException("boom"))

        with self.assertRaises(HTTPException) as context:
            get_parking_segment("001", response, "高雄市", service)

        self.assertEqual(context.exception.status_code, 502)


if __name__ == "__main__":
    unittest.main()
