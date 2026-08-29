import { describe, expect, it } from "vitest";
import { trafficLayerCatalog } from "@/data/trafficLayerCatalog";

describe("trafficLayerCatalog", () => {
  it("includes the approved official live traffic layer", () => {
    expect(trafficLayerCatalog.map((layer) => layer.id)).toEqual([
      "liveTraffic",
      "panorama360",
      "cctv",
      "roadEvents",
      "vehicleDetectors",
      "bikeShare",
      "metro",
      "parkingLots",
      "parkingSegments",
    ]);
  });

  it("does not present the unverified 360 panorama source as available", () => {
    expect(trafficLayerCatalog.find((layer) => layer.id === "panorama360")).toMatchObject({
      id: "panorama360",
      availability: "sourcePending",
      defaultVisible: false,
    });
  });

  it("shows road events by default and keeps future layers opt-in", () => {
    expect(trafficLayerCatalog.find((layer) => layer.id === "roadEvents"))
      .toMatchObject({ availability: "available", defaultVisible: true });
    expect(trafficLayerCatalog.filter((layer) => layer.defaultVisible)).toHaveLength(1);
  });
});
