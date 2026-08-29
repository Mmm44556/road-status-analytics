import unittest

from server.services.parking_segment_service import (
    ParkingSegmentService,
    SegmentNotFoundError,
    merge_parking_segment_data,
)


class MergeParkingSegmentDataTests(unittest.TestCase):
    def test_merges_segment_and_availability_by_parking_segment_id(self):
        segments = [{
            "ParkingSegmentID": "001",
            "ParkingSegmentName": {"Zh_tw": "建軍路"},
            "ParkingSegmentPosition": {"PositionLat": 22.6636242, "PositionLon": 120.3042224},
            "Description": ".",
            "FareDescription": "半時計15",
        }]
        availabilities = [{
            "ParkingSegmentID": "001",
            "TotalSpaces": 33,
            "AvailableSpaces": 3,
            "ServiceStatus": 1,
            "FullStatus": 0,
            "DataCollectTime": "2026-08-29T23:02:05+08:00",
        }]

        merged = merge_parking_segment_data(segments, availabilities)

        self.assertEqual(len(merged), 1)
        segment = merged[0]
        self.assertEqual(segment["segmentId"], "001")
        self.assertEqual(segment["name"], "建軍路")
        self.assertEqual(segment["description"], ".")
        self.assertEqual(segment["positionLon"], 120.3042224)
        self.assertEqual(segment["fareDescription"], "半時計15")
        self.assertEqual(segment["totalSpaces"], 33)
        self.assertEqual(segment["availableSpaces"], 3)
        self.assertEqual(segment["serviceStatus"], 1)
        self.assertEqual(segment["updateTime"], "2026-08-29T23:02:05+08:00")

    def test_returns_none_for_live_fields_when_no_availability_record_matches(self):
        segments = [{"ParkingSegmentID": "offline-segment", "ParkingSegmentName": {}}]

        merged = merge_parking_segment_data(segments, availabilities=[])

        segment = merged[0]
        self.assertIsNone(segment["totalSpaces"])
        self.assertIsNone(segment["availableSpaces"])
        self.assertIsNone(segment["serviceStatus"])
        self.assertIsNone(segment["updateTime"])

    def test_falls_back_to_empty_string_when_name_is_missing(self):
        segments = [{"ParkingSegmentID": "s1"}]

        merged = merge_parking_segment_data(segments, availabilities=[])

        self.assertEqual(merged[0]["name"], "")
        self.assertEqual(merged[0]["description"], "")
        self.assertEqual(merged[0]["fareDescription"], "")


class ParkingSegmentServiceTests(unittest.TestCase):
    def test_fetches_and_merges_city_scoped_segments_and_availability(self):
        class FakeClient:
            def __init__(self):
                self.calls = []

            def fetch_parking_data(self, resource, scope, *, filter_expr=None):
                self.calls.append((resource, scope, filter_expr))
                if resource == "OnStreet/ParkingSegment":
                    return {"ParkingSegments": [{"ParkingSegmentID": "s1"}]}
                return {"CurbParkingSegmentAvailabilities": []}

        client = FakeClient()
        service = ParkingSegmentService(client, clock=lambda: 1_000)

        result = service.get_city_parking_segments("高雄市")

        self.assertEqual(result["city"], "Kaohsiung")
        self.assertEqual(result["segments"][0]["segmentId"], "s1")
        self.assertIn(("OnStreet/ParkingSegment", "City/Kaohsiung", None), client.calls)
        self.assertIn(
            ("OnStreet/ParkingSegmentAvailability", "City/Kaohsiung", None), client.calls
        )

    def test_caches_segment_and_availability_independently_within_ttl(self):
        class FakeClient:
            def __init__(self):
                self.calls = []

            def fetch_parking_data(self, resource, scope, *, filter_expr=None):
                self.calls.append(resource)
                if resource == "OnStreet/ParkingSegment":
                    return {"ParkingSegments": []}
                return {"CurbParkingSegmentAvailabilities": []}

        client = FakeClient()
        service = ParkingSegmentService(client, clock=lambda: 1_000)

        service.get_city_parking_segments("高雄市")
        service.get_city_parking_segments("高雄市")

        self.assertEqual(client.calls.count("OnStreet/ParkingSegment"), 1)
        self.assertEqual(client.calls.count("OnStreet/ParkingSegmentAvailability"), 1)

    def test_single_segment_reuses_cached_static_list_and_filters_availability(self):
        class FakeClient:
            def __init__(self):
                self.calls = []

            def fetch_parking_data(self, resource, scope, *, filter_expr=None):
                self.calls.append((resource, scope, filter_expr))
                if resource == "OnStreet/ParkingSegment":
                    return {"ParkingSegments": [
                        {"ParkingSegmentID": "s1"}, {"ParkingSegmentID": "s2"},
                    ]}
                return {
                    "CurbParkingSegmentAvailabilities": [
                        {"ParkingSegmentID": "s1", "AvailableSpaces": 3},
                    ]
                }

        client = FakeClient()
        service = ParkingSegmentService(client, clock=lambda: 1_000)

        # 先跑一次整批查詢，讓靜態路段清單進快取。
        service.get_city_parking_segments("高雄市")
        client.calls.clear()

        result = service.get_single_segment("高雄市", "s1")

        self.assertEqual(result["segmentId"], "s1")
        self.assertEqual(result["availableSpaces"], 3)
        # 靜態清單沿用快取，不重新打 TDX；只有即時可用車位用 $filter 單獨打一次。
        self.assertEqual(
            client.calls,
            [("OnStreet/ParkingSegmentAvailability", "City/Kaohsiung", "ParkingSegmentID eq 's1'")],
        )

    def test_single_segment_raises_when_segment_id_is_unknown(self):
        class FakeClient:
            def fetch_parking_data(self, resource, scope, *, filter_expr=None):
                if resource == "OnStreet/ParkingSegment":
                    return {"ParkingSegments": [{"ParkingSegmentID": "s1"}]}
                return {"CurbParkingSegmentAvailabilities": []}

        service = ParkingSegmentService(FakeClient(), clock=lambda: 1_000)

        with self.assertRaises(SegmentNotFoundError):
            service.get_single_segment("高雄市", "does-not-exist")

    def test_single_segment_escapes_single_quotes_in_the_odata_filter(self):
        class FakeClient:
            def __init__(self):
                self.calls = []

            def fetch_parking_data(self, resource, scope, *, filter_expr=None):
                self.calls.append(filter_expr)
                if resource == "OnStreet/ParkingSegment":
                    return {"ParkingSegments": [{"ParkingSegmentID": "o'brien"}]}
                return {"CurbParkingSegmentAvailabilities": []}

        client = FakeClient()
        service = ParkingSegmentService(client, clock=lambda: 1_000)

        service.get_single_segment("高雄市", "o'brien")

        self.assertIn("ParkingSegmentID eq 'o''brien'", client.calls)


if __name__ == "__main__":
    unittest.main()
