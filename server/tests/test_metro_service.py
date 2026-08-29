import unittest

from server.services.metro_service import MetroService, StationNotFoundError, merge_metro_data


class MergeMetroDataTests(unittest.TestCase):
    def test_keeps_only_the_soonest_train_per_direction(self):
        stations = [{
            "StationUID": "KRTC-O1",
            "StationID": "O1",
            "StationName": {"Zh_tw": "哈瑪星", "En": "Hamasen"},
            "StationPosition": {"PositionLon": 120.274508, "PositionLat": 22.621492},
        }]
        live_boards = [
            {"StationID": "O1", "TripHeadSign": "往大寮", "EstimateTime": 10,
             "SrcUpdateTime": "2026-08-29T21:50:00+08:00"},
            {"StationID": "O1", "TripHeadSign": "往大寮", "EstimateTime": 2,
             "SrcUpdateTime": "2026-08-29T21:56:34+08:00"},
            {"StationID": "O1", "TripHeadSign": "往哈瑪星", "EstimateTime": 5,
             "SrcUpdateTime": "2026-08-29T21:55:00+08:00"},
        ]

        merged = merge_metro_data(stations, live_boards, "捷運")

        self.assertEqual(len(merged), 1)
        station = merged[0]
        self.assertEqual(station["stationId"], "KRTC-O1")
        self.assertEqual(station["name"], "哈瑪星")
        self.assertEqual(station["system"], "捷運")
        expected = sorted(
            [
                {"direction": "往大寮", "estimateMinutes": 2},
                {"direction": "往哈瑪星", "estimateMinutes": 5},
            ],
            key=lambda t: t["direction"],
        )
        self.assertEqual(sorted(station["nextTrains"], key=lambda t: t["direction"]), expected)
        # 全站顯示一個更新時間：取最快進站（往大寮 2 分鐘後）那筆記錄的時間。
        self.assertEqual(station["updateTime"], "2026-08-29T21:56:34+08:00")

    def test_falls_back_to_platform_update_time_when_source_time_is_missing(self):
        stations = [{"StationUID": "KRTC-O1", "StationID": "O1", "StationName": {}}]
        live_boards = [{
            "StationID": "O1", "TripHeadSign": "往大寮", "EstimateTime": 2,
            "UpdateTime": "2026-08-29T21:56:34+08:00",
        }]

        merged = merge_metro_data(stations, live_boards, "捷運")

        self.assertEqual(merged[0]["updateTime"], "2026-08-29T21:56:34+08:00")

    def test_returns_empty_next_trains_when_no_live_board_matches(self):
        stations = [{"StationUID": "KLRT-C1", "StationID": "C1", "StationName": {}}]

        merged = merge_metro_data(stations, live_boards=[], system_label="輕軌")

        self.assertEqual(merged[0]["nextTrains"], [])
        self.assertIsNone(merged[0]["updateTime"])


class MetroServiceTests(unittest.TestCase):
    def test_fetches_and_merges_both_operators_for_kaohsiung(self):
        class FakeClient:
            def __init__(self):
                self.calls = []

            def fetch_metro_data(self, resource, operator):
                self.calls.append((resource, operator))
                if resource == "Station":
                    return [{"StationUID": f"{operator}-1", "StationID": "1", "StationName": {}}]
                return []

        client = FakeClient()
        service = MetroService(client, clock=lambda: 1_000)

        result = service.get_city_metro_stations("高雄市")

        self.assertEqual(result["city"], "Kaohsiung")
        station_ids = {station["stationId"] for station in result["stations"]}
        self.assertEqual(station_ids, {"KRTC-1", "KLRT-1"})
        self.assertIn(("Station", "KRTC"), client.calls)
        self.assertIn(("Station", "KLRT"), client.calls)

    def test_returns_empty_stations_for_a_city_without_configured_operators(self):
        class FakeClient:
            def fetch_metro_data(self, resource, operator):
                raise AssertionError("should not fetch when no operator is configured")

        service = MetroService(FakeClient(), clock=lambda: 1_000)

        result = service.get_city_metro_stations("臺北市")

        self.assertEqual(result, {"city": "Taipei", "stations": []})

    def test_keeps_the_other_system_when_one_operator_fails(self):
        import requests

        class FakeClient:
            def fetch_metro_data(self, resource, operator):
                if operator == "KLRT":
                    raise requests.RequestException("boom")
                if resource == "Station":
                    return [{"StationUID": "KRTC-1", "StationID": "1", "StationName": {}}]
                return []

        service = MetroService(FakeClient(), clock=lambda: 1_000)

        result = service.get_city_metro_stations("高雄市")

        self.assertEqual(len(result["stations"]), 1)
        self.assertEqual(result["stations"][0]["stationId"], "KRTC-1")

    def test_caches_station_and_live_board_independently_within_ttl(self):
        class FakeClient:
            def __init__(self):
                self.calls = []

            def fetch_metro_data(self, resource, operator):
                self.calls.append((resource, operator))
                return [] if resource == "Station" else []

        client = FakeClient()
        service = MetroService(client, clock=lambda: 1_000)

        service.get_city_metro_stations("高雄市")
        service.get_city_metro_stations("高雄市")

        self.assertEqual(client.calls.count(("Station", "KRTC")), 1)
        self.assertEqual(client.calls.count(("LiveBoard", "KRTC")), 1)

    def test_single_station_finds_the_right_operator_and_filters_live_board(self):
        class FakeClient:
            def __init__(self):
                self.calls = []

            def fetch_metro_data(self, resource, operator, *, filter_expr=None):
                self.calls.append((resource, operator, filter_expr))
                if resource == "Station" and operator == "KRTC":
                    return [{"StationUID": "KRTC-O1", "StationID": "O1", "StationName": {}}]
                if resource == "Station" and operator == "KLRT":
                    return [{"StationUID": "KLRT-C1", "StationID": "C1", "StationName": {}}]
                if resource == "LiveBoard" and operator == "KRTC":
                    return [{"StationID": "O1", "TripHeadSign": "往大寮", "EstimateTime": 2}]
                return []

        client = FakeClient()
        service = MetroService(client, clock=lambda: 1_000)

        # 先跑一次整批查詢，讓兩個單位的靜態站點清單都進快取。
        service.get_city_metro_stations("高雄市")
        client.calls.clear()

        result = service.get_single_station("高雄市", "KRTC-O1")

        self.assertEqual(result["stationId"], "KRTC-O1")
        self.assertEqual(result["system"], "捷運")
        self.assertEqual(result["nextTrains"], [{"direction": "往大寮", "estimateMinutes": 2}])
        # 靜態清單沿用快取，不重新打 TDX；只對「該站所屬單位」的 LiveBoard 用 $filter 打一次，
        # 不會誤打另一個單位（KLRT）。
        self.assertEqual(client.calls, [("LiveBoard", "KRTC", "StationID eq 'O1'")])

    def test_single_station_raises_when_station_id_is_unknown(self):
        class FakeClient:
            def fetch_metro_data(self, resource, operator, *, filter_expr=None):
                return [] if resource == "Station" else []

        service = MetroService(FakeClient(), clock=lambda: 1_000)

        with self.assertRaises(StationNotFoundError):
            service.get_single_station("高雄市", "does-not-exist")

    def test_single_station_escapes_single_quotes_in_the_odata_filter(self):
        class FakeClient:
            def __init__(self):
                self.calls = []

            def fetch_metro_data(self, resource, operator, *, filter_expr=None):
                self.calls.append(filter_expr)
                if resource == "Station" and operator == "KRTC":
                    return [{"StationUID": "KRTC-x", "StationID": "o'brien", "StationName": {}}]
                return [] if resource == "Station" else []

        client = FakeClient()
        service = MetroService(client, clock=lambda: 1_000)

        service.get_single_station("高雄市", "KRTC-x")

        self.assertIn("StationID eq 'o''brien'", client.calls)


if __name__ == "__main__":
    unittest.main()
