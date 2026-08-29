import unittest

from server.services.bike_service import BikeService, StationNotFoundError, merge_bike_data


class MergeBikeDataTests(unittest.TestCase):
    def test_merges_station_and_availability_by_station_uid(self):
        stations = [{
            "StationUID": "KHH501201001",
            "StationName": {"Zh_tw": "捷運美麗島站(10號出口)", "En": "KRT Formosa Blvd."},
            "StationAddress": {"Zh_tw": "中山一路168號前方", "En": "No.168, Zhongshan 1st. Rd."},
            "StationPosition": {"PositionLon": 120.30212, "PositionLat": 22.63213},
            "BikesCapacity": 23,
        }]
        availabilities = [{
            "StationUID": "KHH501201001",
            "ServiceStatus": 1,
            "AvailableRentBikes": 6,
            "AvailableReturnBikes": 16,
            "AvailableRentBikesDetail": {"GeneralBikes": 6, "ElectricBikes": 0},
            "SrcUpdateTime": "2026-08-29T00:47:03+08:00",
            "UpdateTime": "2026-08-29T21:58:36+08:00",
        }]

        merged = merge_bike_data(stations, availabilities)

        self.assertEqual(len(merged), 1)
        station = merged[0]
        self.assertEqual(station["stationId"], "KHH501201001")
        self.assertEqual(station["name"], "捷運美麗島站(10號出口)")
        self.assertEqual(station["address"], "中山一路168號前方")
        self.assertEqual(station["positionLon"], 120.30212)
        self.assertEqual(station["capacity"], 23)
        self.assertEqual(station["serviceStatus"], 1)
        self.assertEqual(station["availableRentBikes"], 6)
        self.assertEqual(station["availableReturnBikes"], 16)
        self.assertEqual(station["availableElectricBikes"], 0)
        # 站點本身回報的 SrcUpdateTime 比 TDX 平台快取的 UpdateTime 更能反映資料新舊，優先採用。
        self.assertEqual(station["updateTime"], "2026-08-29T00:47:03+08:00")

    def test_falls_back_to_platform_update_time_when_source_time_is_missing(self):
        stations = [{"StationUID": "s1"}]
        availabilities = [{"StationUID": "s1", "UpdateTime": "2026-08-29T21:58:36+08:00"}]

        merged = merge_bike_data(stations, availabilities)

        self.assertEqual(merged[0]["updateTime"], "2026-08-29T21:58:36+08:00")

    def test_returns_none_for_live_fields_when_no_availability_record_matches(self):
        stations = [{"StationUID": "offline-station", "StationName": {}, "StationAddress": {}}]

        merged = merge_bike_data(stations, availabilities=[])

        station = merged[0]
        self.assertIsNone(station["serviceStatus"])
        self.assertIsNone(station["availableRentBikes"])
        self.assertIsNone(station["availableReturnBikes"])
        self.assertIsNone(station["availableElectricBikes"])
        self.assertIsNone(station["updateTime"])

    def test_falls_back_to_empty_string_when_bilingual_name_is_missing(self):
        stations = [{"StationUID": "s1", "StationPosition": {}}]

        merged = merge_bike_data(stations, availabilities=[])

        self.assertEqual(merged[0]["name"], "")
        self.assertEqual(merged[0]["address"], "")


class BikeServiceTests(unittest.TestCase):
    def test_fetches_and_merges_city_scoped_station_and_availability(self):
        class FakeClient:
            def __init__(self):
                self.calls = []

            def fetch_bike_data(self, resource, scope):
                self.calls.append((resource, scope))
                if resource == "Station":
                    return [{"StationUID": "s1"}]
                return []

        client = FakeClient()
        service = BikeService(client, clock=lambda: 1_000)

        result = service.get_city_bikes("高雄市")

        self.assertEqual(result["city"], "Kaohsiung")
        self.assertEqual(result["stations"][0]["stationId"], "s1")
        self.assertIn(("Station", "City/Kaohsiung"), client.calls)
        self.assertIn(("Availability", "City/Kaohsiung"), client.calls)

    def test_caches_station_and_availability_independently_within_ttl(self):
        class FakeClient:
            def __init__(self):
                self.calls = []

            def fetch_bike_data(self, resource, scope):
                self.calls.append(resource)
                return [] if resource == "Station" else []

        client = FakeClient()
        service = BikeService(client, clock=lambda: 1_000)

        service.get_city_bikes("高雄市")
        service.get_city_bikes("高雄市")

        self.assertEqual(client.calls.count("Station"), 1)
        self.assertEqual(client.calls.count("Availability"), 1)

    def test_single_station_reuses_cached_station_list_and_filters_availability(self):
        class FakeClient:
            def __init__(self):
                self.calls = []

            def fetch_bike_data(self, resource, scope, *, filter_expr=None):
                self.calls.append((resource, scope, filter_expr))
                if resource == "Station":
                    return [{"StationUID": "s1"}, {"StationUID": "s2"}]
                return [{"StationUID": "s1", "AvailableRentBikes": 3}]

        client = FakeClient()
        service = BikeService(client, clock=lambda: 1_000)

        # 先跑一次整批查詢，讓靜態站點清單進快取。
        service.get_city_bikes("高雄市")
        client.calls.clear()

        result = service.get_single_station("高雄市", "s1")

        self.assertEqual(result["stationId"], "s1")
        self.assertEqual(result["availableRentBikes"], 3)
        # 靜態站點清單沿用快取，不重新打 TDX；只有 Availability 用 $filter 單獨打一次。
        self.assertEqual(client.calls, [("Availability", "City/Kaohsiung", "StationUID eq 's1'")])

    def test_single_station_raises_when_station_id_is_unknown(self):
        class FakeClient:
            def fetch_bike_data(self, resource, scope, *, filter_expr=None):
                return [{"StationUID": "s1"}] if resource == "Station" else []

        service = BikeService(FakeClient(), clock=lambda: 1_000)

        with self.assertRaises(StationNotFoundError):
            service.get_single_station("高雄市", "does-not-exist")

    def test_single_station_escapes_single_quotes_in_the_odata_filter(self):
        class FakeClient:
            def __init__(self):
                self.calls = []

            def fetch_bike_data(self, resource, scope, *, filter_expr=None):
                self.calls.append(filter_expr)
                if resource == "Station":
                    return [{"StationUID": "o'brien"}]
                return []

        client = FakeClient()
        service = BikeService(client, clock=lambda: 1_000)

        service.get_single_station("高雄市", "o'brien")

        self.assertIn("StationUID eq 'o''brien'", client.calls)


if __name__ == "__main__":
    unittest.main()
