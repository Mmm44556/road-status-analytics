import unittest

from server.services.parking_lot_service import (
    LotNotFoundError,
    ParkingLotService,
    merge_parking_lot_data,
)


class MergeParkingLotDataTests(unittest.TestCase):
    def test_merges_lot_and_availability_by_car_park_id(self):
        lots = [{
            "CarParkID": "KHA00001",
            "CarParkName": {"Zh_tw": "五都重平站停車場"},
            "CarParkPosition": {"PositionLat": 22.58779, "PositionLon": 120.32149},
            "Address": "高雄市前鎮區鎮中路、翠亨北路口",
            "FareDescription": "計次15元/次",
            "IsMotorcycle": 0,
        }]
        availabilities = [{
            "CarParkID": "KHA00001",
            "TotalSpaces": 54,
            "AvailableSpaces": 15,
            "ServiceStatus": 1,
            "FullStatus": 0,
            "DataCollectTime": "2026-08-29T23:03:08+08:00",
        }]

        merged = merge_parking_lot_data(lots, availabilities)

        self.assertEqual(len(merged), 1)
        lot = merged[0]
        self.assertEqual(lot["lotId"], "KHA00001")
        self.assertEqual(lot["name"], "五都重平站停車場")
        self.assertEqual(lot["address"], "高雄市前鎮區鎮中路、翠亨北路口")
        self.assertEqual(lot["positionLon"], 120.32149)
        self.assertEqual(lot["fareDescription"], "計次15元/次")
        self.assertFalse(lot["isMotorcycle"])
        self.assertEqual(lot["totalSpaces"], 54)
        self.assertEqual(lot["availableSpaces"], 15)
        self.assertEqual(lot["serviceStatus"], 1)
        self.assertEqual(lot["updateTime"], "2026-08-29T23:03:08+08:00")

    def test_returns_none_for_live_fields_when_no_availability_record_matches(self):
        lots = [{"CarParkID": "offline-lot", "CarParkName": {}}]

        merged = merge_parking_lot_data(lots, availabilities=[])

        lot = merged[0]
        self.assertIsNone(lot["totalSpaces"])
        self.assertIsNone(lot["availableSpaces"])
        self.assertIsNone(lot["serviceStatus"])
        self.assertIsNone(lot["updateTime"])

    def test_falls_back_to_empty_string_when_name_is_missing(self):
        lots = [{"CarParkID": "s1"}]

        merged = merge_parking_lot_data(lots, availabilities=[])

        self.assertEqual(merged[0]["name"], "")
        self.assertEqual(merged[0]["address"], "")
        self.assertEqual(merged[0]["fareDescription"], "")


class ParkingLotServiceTests(unittest.TestCase):
    def test_fetches_and_merges_city_scoped_lots_and_availability(self):
        class FakeClient:
            def __init__(self):
                self.calls = []

            def fetch_parking_data(self, resource, scope, *, filter_expr=None):
                self.calls.append((resource, scope, filter_expr))
                if resource == "OffStreet/CarPark":
                    return {"CarParks": [{"CarParkID": "s1"}]}
                return {"ParkingAvailabilities": []}

        client = FakeClient()
        service = ParkingLotService(client, clock=lambda: 1_000)

        result = service.get_city_parking_lots("高雄市")

        self.assertEqual(result["city"], "Kaohsiung")
        self.assertEqual(result["lots"][0]["lotId"], "s1")
        self.assertIn(("OffStreet/CarPark", "City/Kaohsiung", None), client.calls)
        self.assertIn(("OffStreet/ParkingAvailability", "City/Kaohsiung", None), client.calls)

    def test_caches_lot_and_availability_independently_within_ttl(self):
        class FakeClient:
            def __init__(self):
                self.calls = []

            def fetch_parking_data(self, resource, scope, *, filter_expr=None):
                self.calls.append(resource)
                if resource == "OffStreet/CarPark":
                    return {"CarParks": []}
                return {"ParkingAvailabilities": []}

        client = FakeClient()
        service = ParkingLotService(client, clock=lambda: 1_000)

        service.get_city_parking_lots("高雄市")
        service.get_city_parking_lots("高雄市")

        self.assertEqual(client.calls.count("OffStreet/CarPark"), 1)
        self.assertEqual(client.calls.count("OffStreet/ParkingAvailability"), 1)

    def test_single_lot_reuses_cached_static_list_and_filters_availability(self):
        class FakeClient:
            def __init__(self):
                self.calls = []

            def fetch_parking_data(self, resource, scope, *, filter_expr=None):
                self.calls.append((resource, scope, filter_expr))
                if resource == "OffStreet/CarPark":
                    return {"CarParks": [{"CarParkID": "s1"}, {"CarParkID": "s2"}]}
                return {"ParkingAvailabilities": [{"CarParkID": "s1", "AvailableSpaces": 3}]}

        client = FakeClient()
        service = ParkingLotService(client, clock=lambda: 1_000)

        # 先跑一次整批查詢，讓靜態停車場清單進快取。
        service.get_city_parking_lots("高雄市")
        client.calls.clear()

        result = service.get_single_lot("高雄市", "s1")

        self.assertEqual(result["lotId"], "s1")
        self.assertEqual(result["availableSpaces"], 3)
        # 靜態清單沿用快取，不重新打 TDX；只有即時可用車位用 $filter 單獨打一次。
        self.assertEqual(
            client.calls,
            [("OffStreet/ParkingAvailability", "City/Kaohsiung", "CarParkID eq 's1'")],
        )

    def test_single_lot_raises_when_lot_id_is_unknown(self):
        class FakeClient:
            def fetch_parking_data(self, resource, scope, *, filter_expr=None):
                if resource == "OffStreet/CarPark":
                    return {"CarParks": [{"CarParkID": "s1"}]}
                return {"ParkingAvailabilities": []}

        service = ParkingLotService(FakeClient(), clock=lambda: 1_000)

        with self.assertRaises(LotNotFoundError):
            service.get_single_lot("高雄市", "does-not-exist")

    def test_single_lot_escapes_single_quotes_in_the_odata_filter(self):
        class FakeClient:
            def __init__(self):
                self.calls = []

            def fetch_parking_data(self, resource, scope, *, filter_expr=None):
                self.calls.append(filter_expr)
                if resource == "OffStreet/CarPark":
                    return {"CarParks": [{"CarParkID": "o'brien"}]}
                return {"ParkingAvailabilities": []}

        client = FakeClient()
        service = ParkingLotService(client, clock=lambda: 1_000)

        service.get_single_lot("高雄市", "o'brien")

        self.assertIn("CarParkID eq 'o''brien'", client.calls)


if __name__ == "__main__":
    unittest.main()
