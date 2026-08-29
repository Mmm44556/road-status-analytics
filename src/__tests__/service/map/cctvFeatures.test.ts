import { describe, expect, it } from "vitest";
import { cctvsToMapPoints, getCctvStreamKind } from "@/service/map/features/cctvFeatures";
import type { Cctv } from "@/service/cctvApi";

const baseCctv: Cctv = {
  CCTVID: "cctv-1",
  LinkID: "link-1",
  VideoStreamURL: "https://cctv.example.gov.tw/stream",
  LocationType: 1,
  PositionLon: 120.65,
  PositionLat: 24.18,
  RoadID: "road-1",
  RoadName: "中華路",
  RoadClass: 6,
  RoadDirection: "N",
};

describe("CCTV map features", () => {
  it("converts a single CCTV into a map point with one camera", () => {
    expect(cctvsToMapPoints([baseCctv])).toEqual([{
      id: "cctv-1",
      longitude: 120.65,
      latitude: 24.18,
      cameras: [{
        id: "cctv-1",
        roadName: "中華路",
        roadDirection: "N",
        description: "",
        streamUrl: "https://cctv.example.gov.tw/stream",
        imageUrl: "cctv-1",
        streamKind: "image",
        locationType: 1,
      }],
    }]);
  });

  it("uses the optional surveillance description when present", () => {
    const points = cctvsToMapPoints([{
      ...baseCctv,
      SurveillanceDescription: "中華三路、建國三路",
    }]);

    expect(points[0].cameras[0].description).toBe("中華三路、建國三路");
  });

  it("ignores out-of-range coordinates", () => {
    expect(cctvsToMapPoints([{ ...baseCctv, PositionLon: 999 }])).toHaveLength(0);
  });

  it("keeps WSS FLV streams for the video player", () => {
    const points = cctvsToMapPoints([
      { ...baseCctv, VideoStreamURL: "wss://camera.example/flv/live" },
    ]);

    expect(points[0].cameras[0].streamKind).toBe("flv-websocket");
  });

  it.each([
    ["https://camera.example/live.m3u8", "hls"],
    ["https://camera.example/live.m3u8?token=abc", "hls"],
    ["https://camera.example/cgi-bin/live.cgi?cam=17&stream=1", "hls-page"],
    ["wss://camera.example/flv/live", "flv-websocket"],
    ["https://camera.example/snapshot", "image"],
    ["wss://camera.example/live", "unsupported"],
  ])("classifies %s as %s", (url, expectedKind) => {
    expect(getCctvStreamKind(url)).toBe(expectedKind);
  });

  it("removes duplicate CCTVIDs", () => {
    expect(cctvsToMapPoints([baseCctv, baseCctv])).toHaveLength(1);
  });

  it("merges cameras within ~30m of each other into one map point", () => {
    // 同一路口常見多支不同方向的攝影機，座標非常接近（約 11 公尺）。
    const oppositeDirectionCamera: Cctv = {
      ...baseCctv,
      CCTVID: "cctv-2",
      LinkID: "opposite-direction-link",
      PositionLon: 120.6501,
      PositionLat: 24.18,
      RoadDirection: "S",
    };

    const points = cctvsToMapPoints([baseCctv, oppositeDirectionCamera]);

    expect(points).toHaveLength(1);
    expect(points[0].cameras.map((camera) => camera.id)).toEqual([
      "cctv-1",
      "cctv-2",
    ]);
    expect(points[0].cameras.map((camera) => camera.roadDirection)).toEqual([
      "N",
      "S",
    ]);
  });

  it("falls back to empty strings when road identification fields are missing", () => {
    // 少數攝影機（例如未對應到路段的機台）完全沒有 RoadName/RoadDirection。
    const cctvWithoutRoadInfo: Cctv = {
      CCTVID: "cctv-4",
      LinkID: "link-4",
      VideoStreamURL: "https://cctv.example.gov.tw/stream-4",
      LocationType: 1,
      PositionLon: 120.65,
      PositionLat: 24.18,
    };

    const points = cctvsToMapPoints([cctvWithoutRoadInfo]);

    expect(points[0].cameras[0]).toMatchObject({
      roadName: "",
      roadDirection: "",
    });
  });

  it("keeps cameras on the same road but far apart as separate map points", () => {
    // 同一條路的 RoadID 相同，但相隔超過門檻距離就不應合併。
    const distantCameraSameRoad: Cctv = {
      ...baseCctv,
      CCTVID: "cctv-3",
      PositionLon: 120.66,
      PositionLat: 24.19,
    };

    const points = cctvsToMapPoints([baseCctv, distantCameraSameRoad]);

    expect(points).toHaveLength(2);
    expect(points.map((point) => point.cameras.length)).toEqual([1, 1]);
  });
});
