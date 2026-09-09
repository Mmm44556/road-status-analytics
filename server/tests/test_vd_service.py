import unittest

from server.services.vd_service import VdNotFoundError, VdService, merge_vd_live_data


class MergeVdLiveDataTests(unittest.TestCase):
    def test_merges_each_detection_link_with_its_live_lane_readings(self):
        vds = [{
            "VDID": "V000241",
            "PositionLon": 120.3202,
            "PositionLat": 22.68382,
            "RoadName": "民族一路",
            "RoadSection": {"Start": "華夏路(南)", "End": "重愛路(南)"},
            "DetectionLinks": [
                {"LinkID": "link-N", "RoadDirection": "N", "LaneNum": 2, "ActualLaneNum": 2},
            ],
        }]
        vd_lives = [{
            "VDID": "V000241",
            "LinkFlows": [{
                "LinkID": "link-N",
                "Lanes": [
                    {"Speed": 40.0, "Occupancy": 10.0, "Vehicles": [{"VehicleType": "S", "Volume": 3}]},
                    {"Speed": 60.0, "Occupancy": 6.0, "Vehicles": [{"VehicleType": "S", "Volume": 1}]},
                ],
            }],
        }]

        merged = merge_vd_live_data(vds, vd_lives)

        self.assertEqual(len(merged), 1)
        self.assertEqual(merged[0]["vdId"], "V000241")
        self.assertEqual(merged[0]["roadSection"], {"start": "華夏路(南)", "end": "重愛路(南)"})
        link = merged[0]["links"][0]
        self.assertEqual(link["roadDirection"], "N")
        self.assertEqual(link["laneCount"], 2)
        self.assertEqual(link["averageSpeed"], 50.0)
        self.assertEqual(link["averageOccupancy"], 8.0)
        self.assertEqual(link["congestionLevel"], 1)

    def test_excludes_lanes_with_no_detected_vehicles_from_the_average(self):
        vds = [{
            "VDID": "V1",
            "DetectionLinks": [{"LinkID": "link-1", "RoadDirection": "S"}],
        }]
        vd_lives = [{
            "VDID": "V1",
            "LinkFlows": [{
                "LinkID": "link-1",
                "Lanes": [
                    {"Speed": 0.0, "Occupancy": 0.0, "Vehicles": [{"VehicleType": "T", "Volume": 0}]},
                    {"Speed": 30.0, "Occupancy": 4.0, "Vehicles": [{"VehicleType": "S", "Volume": 2}]},
                ],
            }],
        }]

        merged = merge_vd_live_data(vds, vd_lives)

        self.assertEqual(merged[0]["links"][0]["averageSpeed"], 30.0)

    def test_excludes_negative_sentinel_occupancy_values(self):
        # TDX 用負數（實測 -99）代表佔有率無資料；佔有率不可能是負值，須排除，
        # 不能顯示成「佔有率 -99%」這種看似真實的錯誤畫面。
        vds = [{"VDID": "V1", "DetectionLinks": [{"LinkID": "link-1", "RoadDirection": "N"}]}]
        vd_lives = [{
            "VDID": "V1",
            "LinkFlows": [{
                "LinkID": "link-1",
                "Lanes": [
                    {"Speed": 40.0, "Occupancy": -99.0, "Vehicles": [{"VehicleType": "S", "Volume": 1}]},
                ],
            }],
        }]

        merged = merge_vd_live_data(vds, vd_lives)

        self.assertIsNone(merged[0]["links"][0]["averageOccupancy"])
        self.assertEqual(merged[0]["links"][0]["averageSpeed"], 40.0)

    def test_returns_none_instead_of_zero_when_no_live_data_matches(self):
        vds = [{
            "VDID": "V2",
            "DetectionLinks": [{"LinkID": "link-offline", "RoadDirection": "E"}],
        }]

        merged = merge_vd_live_data(vds, vd_lives=[])

        link = merged[0]["links"][0]
        self.assertIsNone(link["averageSpeed"])
        self.assertIsNone(link["averageOccupancy"])
        self.assertIsNone(link["congestionLevel"])

    def test_handles_a_vd_with_no_matching_live_record_at_all(self):
        vds = [{"VDID": "V3", "DetectionLinks": [{"LinkID": "link-1", "RoadDirection": "W"}]}]

        merged = merge_vd_live_data(vds, vd_lives=[{"VDID": "different-vd", "LinkFlows": []}])

        self.assertEqual(len(merged), 1)
        self.assertIsNone(merged[0]["links"][0]["averageSpeed"])


class VdServiceTests(unittest.TestCase):
    def test_fetches_and_merges_city_scoped_static_and_live_data(self):
        class FakeClient:
            def __init__(self):
                self.calls = []

            def fetch_road_traffic(self, resource, scope):
                self.calls.append((resource, scope))
                if resource == "VD":
                    return {"VDs": [{"VDID": "V1", "DetectionLinks": []}]}
                return {"VDLives": []}

        client = FakeClient()
        service = VdService(client, clock=lambda: 1_000)

        result = service.get_city_vds("高雄市")

        self.assertEqual(result["city"], "Kaohsiung")
        self.assertEqual(result["vds"][0]["vdId"], "V1")
        self.assertIn(("VD", "City/Kaohsiung"), client.calls)
        self.assertIn(("Live/VD", "City/Kaohsiung"), client.calls)

    def test_caches_static_and_live_data_independently_within_ttl(self):
        class FakeClient:
            def __init__(self):
                self.calls = []

            def fetch_road_traffic(self, resource, scope):
                self.calls.append(resource)
                if resource == "VD":
                    return {"VDs": []}
                return {"VDLives": []}

        client = FakeClient()
        service = VdService(client, clock=lambda: 1_000)

        service.get_city_vds("高雄市")
        service.get_city_vds("高雄市")

        self.assertEqual(client.calls.count("VD"), 1)
        self.assertEqual(client.calls.count("Live/VD"), 1)

    def test_single_vd_reuses_cached_static_list_and_filters_live_data(self):
        class FakeClient:
            def __init__(self):
                self.calls = []

            def fetch_road_traffic(self, resource, scope, *, filter_expr=None):
                self.calls.append((resource, scope, filter_expr))
                if resource == "VD":
                    return {"VDs": [
                        {"VDID": "V1", "DetectionLinks": []},
                        {"VDID": "V2", "DetectionLinks": []},
                    ]}
                return {"VDLives": [{"VDID": "V1", "LinkFlows": []}]}

        client = FakeClient()
        service = VdService(client, clock=lambda: 1_000)

        # 先跑一次整批查詢，讓靜態 VD 清單進快取。
        service.get_city_vds("高雄市")
        client.calls.clear()

        result = service.get_single_vd("高雄市", "V1")

        self.assertEqual(result["vdId"], "V1")
        # 靜態清單沿用快取，不重新打 TDX；只有即時讀數用 $filter 單獨打一次。
        self.assertEqual(
            client.calls, [("Live/VD", "City/Kaohsiung", "VDID eq 'V1'")]
        )

    def test_single_vd_raises_when_vd_id_is_unknown(self):
        class FakeClient:
            def fetch_road_traffic(self, resource, scope, *, filter_expr=None):
                return {"VDs": [{"VDID": "V1", "DetectionLinks": []}]} if resource == "VD" else {"VDLives": []}

        service = VdService(FakeClient(), clock=lambda: 1_000)

        with self.assertRaises(VdNotFoundError):
            service.get_single_vd("高雄市", "does-not-exist")

    def test_single_vd_escapes_single_quotes_in_the_odata_filter(self):
        class FakeClient:
            def __init__(self):
                self.calls = []

            def fetch_road_traffic(self, resource, scope, *, filter_expr=None):
                self.calls.append(filter_expr)
                if resource == "VD":
                    return {"VDs": [{"VDID": "o'brien", "DetectionLinks": []}]}
                return {"VDLives": []}

        client = FakeClient()
        service = VdService(client, clock=lambda: 1_000)

        service.get_single_vd("高雄市", "o'brien")

        self.assertIn("VDID eq 'o''brien'", client.calls)


if __name__ == "__main__":
    unittest.main()
