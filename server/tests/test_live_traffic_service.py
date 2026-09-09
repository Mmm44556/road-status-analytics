import unittest

from server.services.live_traffic_service import (
    LiveTrafficService,
    aggregate_link_speeds,
    build_live_segments,
    build_vd_segments,
    classify_vd_congestion_level,
    parse_linestring,
)


class LiveTrafficServiceTests(unittest.TestCase):
    def test_parses_tdx_linestring(self):
        self.assertEqual(
            parse_linestring("LINESTRING(120.1 22.5,120.2 22.6)"),
            [[120.1, 22.5], [120.2, 22.6]],
        )

    def test_joins_live_data_and_filters_to_city_bounds(self):
        sections = [{
            "SectionID": "inside",
            "RoadName": "台17線",
            "SectionName": "台17線測試路段",
            "RoadDirection": "S",
        }]
        shapes = [
            {"SectionID": "inside", "Geometry": "LINESTRING(120.30 22.60,120.31 22.61)"},
            {"SectionID": "outside", "Geometry": "LINESTRING(121.50 25.00,121.51 25.01)"},
        ]
        live = [{
            "SectionID": "inside",
            "TravelSpeed": 28,
            "TravelTime": 60,
            "CongestionLevel": "3",
            "DataCollectTime": "2026-08-29T18:00:00+08:00",
        }]

        segments = build_live_segments(
            sections, shapes, live, (120.15, 22.47, 120.96, 23.48), "Highway"
        )

        self.assertEqual(len(segments), 1)
        self.assertEqual(segments[0]["sectionId"], "inside")
        self.assertEqual(segments[0]["congestionLevel"], 3)
        self.assertEqual(segments[0]["roadName"], "台17線")


class VdCongestionLevelTests(unittest.TestCase):
    def test_classifies_speed_into_congestion_levels_at_thresholds(self):
        cases = [
            (35.0, 1), (25.0, 1),
            (24.9, 2), (12.0, 2),
            (11.9, 3), (0.0, 3),
        ]
        for speed, expected_level in cases:
            with self.subTest(speed=speed):
                self.assertEqual(classify_vd_congestion_level(speed), expected_level)

    def test_never_claims_the_two_most_severe_official_congestion_levels(self):
        # 門檻是自訂啟發式，最高只能判到「壅塞」(3)，不宣稱能像官方資料一樣
        # 細分出「嚴重壅塞」(4) 或「極度壅塞」(5)。
        for speed in (0.0, 3.0, 11.9):
            with self.subTest(speed=speed):
                self.assertLessEqual(classify_vd_congestion_level(speed), 3)


class AggregateLinkSpeedsTests(unittest.TestCase):
    def test_excludes_lanes_with_no_detected_vehicles(self):
        vd_lives = [{
            "LinkFlows": [{
                "LinkID": "link-1",
                "Lanes": [
                    # 沒有偵測到車輛，Speed 數值不具參考性，須排除。
                    {"Speed": 0.0, "Vehicles": [{"VehicleType": "T", "Volume": 0}]},
                    {"Speed": 42.0, "Vehicles": [{"VehicleType": "S", "Volume": 3}]},
                ],
            }],
        }]

        self.assertEqual(aggregate_link_speeds(vd_lives), {"link-1": [42.0]})

    def test_merges_speeds_across_multiple_vds_reporting_the_same_link(self):
        vd_lives = [
            {"LinkFlows": [{"LinkID": "link-1", "Lanes": [
                {"Speed": 40.0, "Vehicles": [{"VehicleType": "S", "Volume": 2}]},
            ]}]},
            {"LinkFlows": [{"LinkID": "link-1", "Lanes": [
                {"Speed": 20.0, "Vehicles": [{"VehicleType": "S", "Volume": 1}]},
            ]}]},
        ]

        self.assertEqual(aggregate_link_speeds(vd_lives), {"link-1": [40.0, 20.0]})

    def test_ignores_link_flows_missing_a_link_id(self):
        vd_lives = [{"LinkFlows": [{"Lanes": [
            {"Speed": 40.0, "Vehicles": [{"VehicleType": "S", "Volume": 2}]},
        ]}]}]

        self.assertEqual(aggregate_link_speeds(vd_lives), {})


class BuildVdSegmentsTests(unittest.TestCase):
    def test_builds_a_segment_from_the_average_speed_across_its_link_ids(self):
        sections = [{
            "SectionID": "sec-1",
            "RoadName": "民族一路",
            "SectionName": "民族一路測試路段",
            "RoadDirection": "S",
            "LinkIDs": [{"LinkID": "link-1"}, {"LinkID": "link-2"}],
        }]
        shapes = [{
            "SectionID": "sec-1",
            "Geometry": "LINESTRING(120.30 22.60,120.31 22.61)",
        }]
        link_speeds = {"link-1": [30.0], "link-2": [10.0]}

        segments = build_vd_segments(
            sections, shapes, link_speeds,
            (120.15, 22.47, 120.96, 23.48), "2026-08-29T18:00:00+08:00",
        )

        self.assertEqual(len(segments), 1)
        self.assertEqual(segments[0]["travelSpeed"], 20.0)
        self.assertEqual(segments[0]["congestionLevel"], 2)
        self.assertEqual(segments[0]["source"], "VD")
        self.assertIsNone(segments[0]["travelTime"])

    def test_excludes_roads_already_covered_by_official_highway_or_freeway_data(self):
        # 市區道路 Section 清單也包含行經市區的省道（例如台17線），已有官方
        # CongestionLevel，VD 不該重複估算同一條路造成地圖上線段重疊或矛盾。
        sections = [{
            "SectionID": "sec-1",
            "RoadName": "台17線",
            "LinkIDs": [{"LinkID": "link-1"}],
        }]
        shapes = [{
            "SectionID": "sec-1",
            "Geometry": "LINESTRING(120.30 22.60,120.31 22.61)",
        }]

        segments = build_vd_segments(
            sections, shapes, {"link-1": [30.0]},
            (120.15, 22.47, 120.96, 23.48), "2026-08-29T18:00:00+08:00",
            excluded_road_names=frozenset({"台17線"}),
        )

        self.assertEqual(segments, [])

    def test_skips_sections_with_no_valid_vd_reading_instead_of_faking_free_flow(self):
        sections = [{
            "SectionID": "sec-1",
            "RoadName": "民族一路",
            "LinkIDs": [{"LinkID": "link-without-data"}],
        }]
        shapes = [{
            "SectionID": "sec-1",
            "Geometry": "LINESTRING(120.30 22.60,120.31 22.61)",
        }]

        segments = build_vd_segments(
            sections, shapes, {}, (120.15, 22.47, 120.96, 23.48), "2026-08-29T18:00:00+08:00",
        )

        self.assertEqual(segments, [])

    def test_filters_out_segments_outside_city_bounds(self):
        sections = [{
            "SectionID": "sec-1",
            "RoadName": "測試路段",
            "LinkIDs": [{"LinkID": "link-1"}],
        }]
        shapes = [{
            "SectionID": "sec-1",
            "Geometry": "LINESTRING(121.50 25.00,121.51 25.01)",
        }]

        segments = build_vd_segments(
            sections, shapes, {"link-1": [30.0]},
            (120.15, 22.47, 120.96, 23.48), "2026-08-29T18:00:00+08:00",
        )

        self.assertEqual(segments, [])


class GetCityLiveTrafficMergesSourcesTests(unittest.TestCase):
    def test_merges_highway_freeway_and_vd_segments(self):
        highway_freeway_payloads = {
            "Section:Highway": {"Sections": [{
                "SectionID": "hw-1", "RoadName": "台17線", "SectionName": "測試",
                "RoadDirection": "S",
            }]},
            "SectionShape:Highway": {"SectionShapes": [{
                "SectionID": "hw-1", "Geometry": "LINESTRING(120.30 22.60,120.31 22.61)",
            }]},
            "Live:Highway": {"UpdateTime": "2026-08-29T18:00:00+08:00", "LiveTraffics": [{
                "SectionID": "hw-1", "TravelSpeed": 50, "TravelTime": 30,
                "CongestionLevel": "1", "DataCollectTime": "2026-08-29T18:00:00+08:00",
            }]},
            "Section:Freeway": {"Sections": []},
            "SectionShape:Freeway": {"SectionShapes": []},
            "Live:Freeway": {"UpdateTime": "2026-08-29T18:00:00+08:00", "LiveTraffics": []},
            "Section:City/Kaohsiung": {"Sections": [
                {
                    "SectionID": "city-1", "RoadName": "民族一路", "SectionName": "測試",
                    "LinkIDs": [{"LinkID": "link-1"}],
                },
                {
                    # 台17線同時出現在市區道路 Section 清單裡，但已由 Highway 官方
                    # 資料涵蓋（見上方 hw-1），VD 不該重複產生這條路的估算線段。
                    "SectionID": "city-2", "RoadName": "台17線", "SectionName": "測試",
                    "LinkIDs": [{"LinkID": "link-2"}],
                },
            ]},
            "SectionShape:City/Kaohsiung": {"SectionShapes": [
                {"SectionID": "city-1", "Geometry": "LINESTRING(120.30 22.60,120.31 22.61)"},
                {"SectionID": "city-2", "Geometry": "LINESTRING(120.32 22.62,120.33 22.63)"},
            ]},
            "Live/VD:City/Kaohsiung": {
                "SrcUpdateTime": "2026-08-29T18:00:00+08:00",
                "VDLives": [{"LinkFlows": [
                    {"LinkID": "link-1", "Lanes": [
                        {"Speed": 20.0, "Vehicles": [{"VehicleType": "S", "Volume": 5}]},
                    ]},
                    {"LinkID": "link-2", "Lanes": [
                        {"Speed": 40.0, "Vehicles": [{"VehicleType": "S", "Volume": 5}]},
                    ]},
                ]}],
            },
        }

        class FakeClient:
            def fetch_road_traffic(self, resource, scope):
                return highway_freeway_payloads[f"{resource}:{scope}"]

        service = LiveTrafficService(FakeClient(), clock=lambda: 1_000)

        result = service.get_city_live_traffic("高雄市")

        sources = {segment["source"] for segment in result["segments"]}
        self.assertEqual(sources, {"Highway", "VD"})
        vd_segments = [s for s in result["segments"] if s["source"] == "VD"]
        self.assertEqual(len(vd_segments), 1)
        self.assertEqual(vd_segments[0]["roadName"], "民族一路")
        self.assertEqual(vd_segments[0]["congestionLevel"], 2)


if __name__ == "__main__":
    unittest.main()
