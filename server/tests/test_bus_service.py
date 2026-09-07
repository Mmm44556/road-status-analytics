import unittest

from server.services.bus_service import (
    BusService,
    RouteShapeNotFoundError,
    normalize_bus_arrivals,
    normalize_bus_stops,
    normalize_route_shape,
)


class NormalizeBusStopsTests(unittest.TestCase):
    def test_normalizes_bus_stops_and_skips_invalid_records(self):
        stops = [
            {
                "StopUID": "KHH1001",
                "StationID": "4144",
                "StopName": {"Zh_tw": "高雄車站"},
                "StopAddress": "建國二路",
                "StopPosition": {"PositionLon": 120.302, "PositionLat": 22.6397},
                "UpdateTime": "2026-09-02T10:00:00+08:00",
            },
            {"StopUID": "missing-position", "StationID": "9999", "StopName": {"Zh_tw": "無座標"}},
        ]

        result = normalize_bus_stops(stops)

        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["stopId"], "4144")
        self.assertEqual(result[0]["name"], "高雄車站")
        self.assertEqual(result[0]["address"], "建國二路")
        self.assertEqual(result[0]["positionLon"], 120.302)

    def test_merges_stops_sharing_the_same_station_id_into_one_point(self):
        # 實測「捷運巨蛋站(裕誠路)」西向站位：4 條路線各自一筆 StopUID，
        # 座標完全相同，只是服務的路線不同，應該合併成地圖上的同一個點。
        stops = [
            {
                "StopUID": "KHH10000357041",
                "StationID": "4144",
                "StopName": {"Zh_tw": "捷運巨蛋站(裕誠路)"},
                "StopPosition": {"PositionLon": 120.302858, "PositionLat": 22.665876},
                "UpdateTime": "2026-09-02T20:00:00+08:00",
            },
            {
                "StopUID": "KHH10001657042",
                "StationID": "4144",
                "StopName": {"Zh_tw": "捷運巨蛋站(裕誠路)"},
                "StopPosition": {"PositionLon": 120.302858, "PositionLat": 22.665876},
                "UpdateTime": "2026-09-02T21:00:00+08:00",
            },
        ]

        result = normalize_bus_stops(stops)

        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["stopId"], "4144")
        # 取分組內最新的 UpdateTime。
        self.assertEqual(result[0]["updateTime"], "2026-09-02T21:00:00+08:00")

    def test_keeps_different_station_ids_as_separate_points_even_when_nearby(self):
        # 同一站名的東西向站牌是不同實體站位（StationID 不同），不該合併。
        stops = [
            {
                "StopUID": "KHH10000357041",
                "StationID": "4144",
                "StopName": {"Zh_tw": "捷運巨蛋站(裕誠路)"},
                "StopPosition": {"PositionLon": 120.302858, "PositionLat": 22.665876},
            },
            {
                "StopUID": "KHH10000357112",
                "StationID": "4143",
                "StopName": {"Zh_tw": "捷運巨蛋站(裕誠路)"},
                "StopPosition": {"PositionLon": 120.3028, "PositionLat": 22.66572},
            },
        ]

        result = normalize_bus_stops(stops)

        self.assertEqual({stop["stopId"] for stop in result}, {"4144", "4143"})


class BusServiceTests(unittest.TestCase):
    def test_fetches_city_stops_and_reuses_cache(self):
        class FakeClient:
            def __init__(self):
                self.calls = []

            def fetch_bus_data(self, resource, scope, **kwargs):
                self.calls.append((resource, scope, kwargs))
                return []

        client = FakeClient()
        service = BusService(client, clock=lambda: 1_000)

        first = service.get_city_stops("高雄市")
        second = service.get_city_stops("高雄市")

        self.assertEqual(first, {"city": "Kaohsiung", "stops": []})
        self.assertEqual(second, first)
        self.assertEqual(client.calls, [("Stop", "City/Kaohsiung", {})])

    def test_fetches_and_caches_arrivals_for_one_stop(self):
        class FakeClient:
            def __init__(self):
                self.calls = []

            def fetch_bus_data(self, resource, scope, **kwargs):
                self.calls.append((resource, scope, kwargs))
                if resource == "Route":
                    return [{
                        "RouteUID": "KHH100",
                        "DepartureStopNameZh": "高雄車站",
                        "DestinationStopNameZh": "左營南站",
                    }]
                if resource == "Stop":
                    return [{"StopUID": "KHH1001", "StationID": "4144"}]
                return [{
                    "StopUID": "KHH1001",
                    "RouteUID": "KHH100",
                    "RouteName": {"Zh_tw": "100"},
                    "Direction": 0,
                    "EstimateTime": 180,
                    "StopStatus": 0,
                    "PlateNumb": "ABC-123",
                    "UpdateTime": "2026-09-02T10:00:00+08:00",
                }]

        client = FakeClient()
        service = BusService(client, clock=lambda: 1_000)

        first = service.get_stop_arrivals("高雄市", "4144")
        second = service.get_stop_arrivals("高雄市", "4144")

        self.assertEqual(first, second)
        self.assertEqual(first["arrivals"][0]["routeName"], "100")
        self.assertEqual(first["arrivals"][0]["destination"], "左營南站")
        self.assertEqual(first["arrivals"][0]["estimateSeconds"], 180)
        self.assertEqual(
            client.calls[-1][2]["filter_expr"],
            "StopUID eq 'KHH1001'",
        )

    def test_merges_arrivals_from_every_stop_uid_sharing_the_station_id(self):
        # 對應「捷運巨蛋站(裕誠路)」實測：同一個 StationID 底下 4 條路線各自
        # 一筆 StopUID，查站位到站資訊時要把它們的即時資料全部合併回傳。
        class FakeClient:
            def __init__(self):
                self.calls = []

            def fetch_bus_data(self, resource, scope, **kwargs):
                self.calls.append((resource, scope, kwargs))
                if resource == "Route":
                    return []
                if resource == "Stop":
                    return [
                        {"StopUID": "KHH10000357041", "StationID": "4144"},
                        {"StopUID": "KHH10001657042", "StationID": "4144"},
                        {"StopUID": "KHH10016257042", "StationID": "4144"},
                        {"StopUID": "KHH99999999999", "StationID": "9999"},
                    ]
                return [
                    {"StopUID": "KHH10000357041", "RouteUID": "R3", "RouteName": {"Zh_tw": "3"}, "Direction": 0},
                    {"StopUID": "KHH10001657042", "RouteUID": "R16A", "RouteName": {"Zh_tw": "16A"}, "Direction": 1},
                    {"StopUID": "KHH10016257042", "RouteUID": "R16B", "RouteName": {"Zh_tw": "16B"}, "Direction": 1},
                ]

        client = FakeClient()
        service = BusService(client, clock=lambda: 1_000)

        result = service.get_stop_arrivals("高雄市", "4144")

        route_names = {arrival["routeName"] for arrival in result["arrivals"]}
        self.assertEqual(route_names, {"3", "16A", "16B"})
        arrival_call = next(call for call in client.calls if call[0] == "EstimatedTimeOfArrival")
        filter_expr = arrival_call[2]["filter_expr"]
        for stop_uid in ("KHH10000357041", "KHH10001657042", "KHH10016257042"):
            self.assertIn(stop_uid, filter_expr)
        self.assertNotIn("KHH99999999999", filter_expr)

    def test_falls_back_to_treating_the_id_as_a_stop_uid_when_station_is_unknown(self):
        class FakeClient:
            def __init__(self):
                self.calls = []

            def fetch_bus_data(self, resource, scope, **kwargs):
                self.calls.append((resource, scope, kwargs))
                if resource == "Route":
                    return []
                if resource == "Stop":
                    return []
                return []

        client = FakeClient()
        service = BusService(client, clock=lambda: 1_000)

        service.get_stop_arrivals("高雄市", "KHH1001")

        arrival_call = next(call for call in client.calls if call[0] == "EstimatedTimeOfArrival")
        self.assertEqual(arrival_call[2]["filter_expr"], "StopUID eq 'KHH1001'")


class NormalizeRouteShapeTests(unittest.TestCase):
    def test_parses_the_matching_route_and_direction(self):
        shapes = [
            {
                "RouteUID": "KHH100",
                "RouteName": {"Zh_tw": "100百貨幹線"},
                "Direction": 0,
                "Geometry": "LINESTRING(120.1 22.1,120.2 22.2,120.3 22.3)",
                "UpdateTime": "2026-09-03T00:00:00+08:00",
            },
            {
                "RouteUID": "KHH100",
                "RouteName": {"Zh_tw": "100百貨幹線"},
                "Direction": 1,
                "Geometry": "LINESTRING(120.3 22.3,120.2 22.2,120.1 22.1)",
            },
        ]

        shape = normalize_route_shape(shapes, "KHH100", 0)

        self.assertIsNotNone(shape)
        self.assertEqual(shape["direction"], 0)
        self.assertEqual(shape["routeName"], "100百貨幹線")
        self.assertEqual(shape["coordinates"][0], [120.1, 22.1])
        self.assertEqual(len(shape["coordinates"]), 3)

    def test_returns_none_when_no_shape_matches(self):
        self.assertIsNone(normalize_route_shape([], "KHH999", 0))


class GetRouteShapeTests(unittest.TestCase):
    def test_filters_by_route_and_direction_and_reuses_cache(self):
        class FakeClient:
            def __init__(self):
                self.calls = []

            def fetch_bus_data(self, resource, scope, **kwargs):
                self.calls.append((resource, scope, kwargs))
                return [{
                    "RouteUID": "KHH100",
                    "RouteName": {"Zh_tw": "100百貨幹線"},
                    "Direction": 0,
                    "Geometry": "LINESTRING(120.1 22.1,120.2 22.2)",
                }]

        client = FakeClient()
        service = BusService(client, clock=lambda: 1_000)

        first = service.get_route_shape("高雄市", "KHH100", 0)
        second = service.get_route_shape("高雄市", "KHH100", 0)

        self.assertEqual(first, second)
        self.assertEqual(first["coordinates"], [[120.1, 22.1], [120.2, 22.2]])
        self.assertEqual(len(client.calls), 1)
        self.assertEqual(
            client.calls[0][2]["filter_expr"],
            "RouteUID eq 'KHH100' and Direction eq 0",
        )

    def test_raises_when_route_direction_is_not_found(self):
        class FakeClient:
            def fetch_bus_data(self, resource, scope, **kwargs):
                return []

        service = BusService(FakeClient(), clock=lambda: 1_000)

        with self.assertRaises(RouteShapeNotFoundError):
            service.get_route_shape("高雄市", "KHH999", 0)


class NormalizeBusArrivalsTests(unittest.TestCase):
    def test_normalizes_status_and_uses_reverse_route_destination(self):
        arrivals = normalize_bus_arrivals(
            [{
                "StopUID": "KHH1001",
                "RouteUID": "KHH100",
                "RouteName": {"Zh_tw": "100"},
                "Direction": 1,
                "EstimateTime": None,
                "StopStatus": 3,
            }],
            [{
                "RouteUID": "KHH100",
                "DepartureStopNameZh": "高雄車站",
                "DestinationStopNameZh": "左營南站",
            }],
        )

        self.assertEqual(arrivals[0]["destination"], "高雄車站")
        self.assertEqual(arrivals[0]["stopStatus"], 3)
        self.assertIsNone(arrivals[0]["estimateSeconds"])


if __name__ == "__main__":
    unittest.main()
