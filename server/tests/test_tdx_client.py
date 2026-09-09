import unittest
import threading
from concurrent.futures import ThreadPoolExecutor

import requests

from server.clients.tdx_client import TdxClient, TdxConfigError
from server.observability.metrics import MetricsCollector


class FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


class FakeSession:
    def __init__(self):
        self.post_calls = []
        self.get_calls = []

    def post(self, url, data, timeout):
        self.post_calls.append((url, data, timeout))
        return FakeResponse({"access_token": "test-token", "expires_in": 300})

    def get(self, url, headers, params, timeout):
        self.get_calls.append((url, headers, params, timeout))
        if "CCTV" in url:
            return FakeResponse({"CCTVs": [{"CCTVID": "cctv-1"}]})
        if "/SectionShape/Highway" in url:
            return FakeResponse({"SectionShapes": [{"SectionID": "section-1"}]})
        if "/Bike/Station/City/Kaohsiung" in url:
            return FakeResponse([{"StationUID": "station-1"}])
        if "/Rail/Metro/Station/KRTC" in url:
            return FakeResponse([{"StationUID": "KRTC-O1"}])
        if "/Parking/OffStreet/CarPark/City/Kaohsiung" in url:
            return FakeResponse({"CarParks": [{"CarParkID": "KHA00001"}]})
        key = "LiveEvents" if "LiveEvent" in url else "Events"
        return FakeResponse({key: [{"EventID": "event-1"}]})


class RetryResponse(FakeResponse):
    def __init__(self, status_code, payload=None, headers=None):
        super().__init__(payload or {})
        self.status_code = status_code
        self.headers = headers or {}

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError(response=self)


class RetrySession(FakeSession):
    def __init__(self, responses):
        super().__init__()
        self._responses = iter(responses)

    def get(self, url, headers, params, timeout):
        self.get_calls.append((url, headers, params, timeout))
        return next(self._responses)


class TdxClientTests(unittest.TestCase):
    def test_requires_credentials(self):
        with self.assertRaises(TdxConfigError):
            TdxClient(client_id="", client_secret="")

    def test_reuses_token_and_calls_current_city_event_paths(self):
        session = FakeSession()
        client = TdxClient(
            client_id="client-id",
            client_secret="client-secret",
            session=session,
            clock=lambda: 1_000,
        )

        preview = client.fetch_city_events("Taichung", live=False, top=25)
        live = client.fetch_city_events("Taichung", live=True, top=25)

        self.assertEqual(preview["Events"][0]["EventID"], "event-1")
        self.assertEqual(live["LiveEvents"][0]["EventID"], "event-1")
        self.assertEqual(len(session.post_calls), 1)
        self.assertTrue(session.get_calls[0][0].endswith("/Event/City/Taichung"))
        self.assertTrue(session.get_calls[1][0].endswith("/LiveEvent/City/Taichung"))
        self.assertEqual(session.get_calls[0][1], {"Authorization": "Bearer test-token"})
        self.assertEqual(session.get_calls[0][2], {"$top": 25, "$format": "JSON"})

    def test_coalesces_concurrent_access_token_requests(self):
        class BlockingTokenSession(FakeSession):
            def __init__(self):
                super().__init__()
                self.started = threading.Event()
                self.release = threading.Event()

            def post(self, url, data, timeout):
                self.post_calls.append((url, data, timeout))
                self.started.set()
                self.release.wait(timeout=1)
                return FakeResponse({"access_token": "shared-token", "expires_in": 300})

        session = BlockingTokenSession()
        client = TdxClient("client-id", "client-secret", session=session, clock=lambda: 1_000)

        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = [executor.submit(client._get_access_token) for _ in range(4)]
            self.assertTrue(session.started.wait(timeout=1))
            session.release.set()
            tokens = [future.result(timeout=1) for future in futures]

        self.assertEqual(tokens, ["shared-token"] * 4)
        self.assertEqual(len(session.post_calls), 1)

    def test_fetches_city_cctv(self):
        session = FakeSession()
        client = TdxClient(
            client_id="client-id",
            client_secret="client-secret",
            session=session,
            clock=lambda: 1_000,
        )

        cctv = client.fetch_city_cctv("Kaohsiung", top=50)

        self.assertEqual(cctv["CCTVs"][0]["CCTVID"], "cctv-1")
        self.assertTrue(
            session.get_calls[0][0].endswith(
                "/api/basic/v2/Road/Traffic/CCTV/City/Kaohsiung"
            )
        )
        self.assertEqual(session.get_calls[0][2], {"$top": 50, "$format": "JSON"})

    def test_fetches_scoped_road_traffic_resource(self):
        session = FakeSession()
        client = TdxClient("client-id", "client-secret", session=session, clock=lambda: 1_000)

        result = client.fetch_road_traffic("SectionShape", "Highway")

        self.assertEqual(result["SectionShapes"][0]["SectionID"], "section-1")
        self.assertTrue(session.get_calls[0][0].endswith("/SectionShape/Highway"))
        self.assertEqual(session.get_calls[0][2], {"$format": "JSON"})

    def test_fetches_scoped_bike_resource_as_a_bare_list(self):
        session = FakeSession()
        client = TdxClient("client-id", "client-secret", session=session, clock=lambda: 1_000)

        result = client.fetch_bike_data("Station", "City/Kaohsiung")

        self.assertEqual(result[0]["StationUID"], "station-1")
        self.assertTrue(
            session.get_calls[0][0].endswith("/api/basic/v2/Bike/Station/City/Kaohsiung")
        )
        self.assertEqual(session.get_calls[0][2], {"$format": "JSON"})

    def test_fetches_road_traffic_resource_with_an_odata_filter(self):
        session = FakeSession()
        client = TdxClient("client-id", "client-secret", session=session, clock=lambda: 1_000)

        client.fetch_road_traffic(
            "Live/VD", "City/Kaohsiung", filter_expr="VDID eq 'V000241'"
        )

        self.assertEqual(
            session.get_calls[0][2],
            {"$format": "JSON", "$filter": "VDID eq 'V000241'"},
        )

    def test_fetches_bike_resource_with_an_odata_filter(self):
        session = FakeSession()
        client = TdxClient("client-id", "client-secret", session=session, clock=lambda: 1_000)

        client.fetch_bike_data(
            "Availability", "City/Kaohsiung", filter_expr="StationUID eq 'station-1'"
        )

        self.assertEqual(
            session.get_calls[0][2],
            {"$format": "JSON", "$filter": "StationUID eq 'station-1'"},
        )

    def test_fetches_bus_resource_with_filter_and_selected_fields(self):
        session = FakeSession()
        client = TdxClient("client-id", "client-secret", session=session, clock=lambda: 1_000)

        client.fetch_bus_data(
            "EstimatedTimeOfArrival",
            "City/Kaohsiung",
            filter_expr="StopUID eq 'KHH1001'",
            select="StopUID,RouteName,EstimateTime",
        )

        self.assertEqual(
            session.get_calls[0][2],
            {
                "$format": "JSON",
                "$select": "StopUID,RouteName,EstimateTime",
                "$filter": "StopUID eq 'KHH1001'",
            },
        )

    def test_fetches_bus_stop_resource_with_default_select_including_station_id(self):
        # StationID 是站牌合併成同一實體站位地圖點的依據，一定要在預設
        # $select 裡；漏掉這個欄位會讓合併邏輯永遠分不到組，只能各自成組。
        session = FakeSession()
        client = TdxClient("client-id", "client-secret", session=session, clock=lambda: 1_000)

        client.fetch_bus_data("Stop", "City/Kaohsiung")

        self.assertIn("StationID", session.get_calls[0][2]["$select"])

    def test_fetches_scoped_metro_resource_by_operator(self):
        session = FakeSession()
        client = TdxClient("client-id", "client-secret", session=session, clock=lambda: 1_000)

        result = client.fetch_metro_data("Station", "KRTC")

        self.assertEqual(result[0]["StationUID"], "KRTC-O1")
        self.assertTrue(
            session.get_calls[0][0].endswith("/api/basic/v2/Rail/Metro/Station/KRTC")
        )
        self.assertEqual(session.get_calls[0][2], {"$format": "JSON"})


    def test_fetches_metro_resource_with_an_odata_filter(self):
        session = FakeSession()
        client = TdxClient("client-id", "client-secret", session=session, clock=lambda: 1_000)

        client.fetch_metro_data("LiveBoard", "KRTC", filter_expr="StationID eq 'O1'")

        self.assertEqual(
            session.get_calls[0][2],
            {"$format": "JSON", "$filter": "StationID eq 'O1'"},
        )


    def test_fetches_scoped_parking_resource_as_a_dict(self):
        session = FakeSession()
        client = TdxClient("client-id", "client-secret", session=session, clock=lambda: 1_000)

        result = client.fetch_parking_data("OffStreet/CarPark", "City/Kaohsiung")

        self.assertEqual(result["CarParks"][0]["CarParkID"], "KHA00001")
        self.assertTrue(
            session.get_calls[0][0].endswith(
                "/api/basic/v1/Parking/OffStreet/CarPark/City/Kaohsiung"
            )
        )
        self.assertEqual(session.get_calls[0][2], {"$format": "JSON"})

    def test_fetches_parking_resource_with_an_odata_filter(self):
        session = FakeSession()
        client = TdxClient("client-id", "client-secret", session=session, clock=lambda: 1_000)

        client.fetch_parking_data(
            "OffStreet/ParkingAvailability",
            "City/Kaohsiung",
            filter_expr="CarParkID eq 'KHA00001'",
        )

        self.assertEqual(
            session.get_calls[0][2],
            {"$format": "JSON", "$filter": "CarParkID eq 'KHA00001'"},
        )

    def test_retries_rate_limited_get_using_retry_after(self):
        session = RetrySession([
            RetryResponse(429, headers={"Retry-After": "2"}),
            RetryResponse(200, {"CCTVs": [{"CCTVID": "cctv-1"}]}),
        ])
        delays = []
        metrics = MetricsCollector()
        client = TdxClient(
            "client-id",
            "client-secret",
            session=session,
            clock=lambda: 1_000,
            sleeper=delays.append,
            random_fn=lambda: 0,
            metrics=metrics,
        )

        result = client.fetch_city_cctv("Kaohsiung", top=50)

        self.assertEqual(result["CCTVs"][0]["CCTVID"], "cctv-1")
        self.assertEqual(len(session.get_calls), 2)
        self.assertEqual(delays, [2.0])
        counts = metrics.snapshot()["tdx"]["byResource"]["cctv"]
        self.assertEqual(counts["requests"], 2)
        self.assertEqual(counts["successes"], 1)
        self.assertEqual(counts["retries"], 1)
        self.assertEqual(counts["rateLimited"], 1)
        self.assertEqual(counts["failures"], 0)

    def test_does_not_retry_a_non_transient_client_error(self):
        session = RetrySession([RetryResponse(400)])
        delays = []
        metrics = MetricsCollector()
        client = TdxClient(
            "client-id",
            "client-secret",
            session=session,
            clock=lambda: 1_000,
            sleeper=delays.append,
            metrics=metrics,
        )

        with self.assertRaises(requests.HTTPError):
            client.fetch_city_cctv("Kaohsiung", top=50)

        self.assertEqual(len(session.get_calls), 1)
        self.assertEqual(delays, [])
        counts = metrics.snapshot()["tdx"]["byResource"]["cctv"]
        self.assertEqual(counts["requests"], 1)
        self.assertEqual(counts["failures"], 1)


if __name__ == "__main__":
    unittest.main()
