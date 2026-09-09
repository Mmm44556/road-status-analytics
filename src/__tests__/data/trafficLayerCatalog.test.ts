import { describe, expect, it } from "vitest";
import { trafficLayerCatalog } from "@/data/trafficLayerCatalog";

describe("trafficLayerCatalog", () => {
  it("includes the approved official live traffic layer", () => {
    expect(trafficLayerCatalog.map((layer) => layer.id)).toEqual([
      "liveTraffic",
      "cctv",
      "roadEvents",
      "vehicleDetectors",
      "bikeShare",
      "metro",
      "bus",
      "parkingLots",
      "parkingSegments",
    ]);
  });

  it("keeps every layer opt-in until the user completes an area selection", () => {
    expect(trafficLayerCatalog.find((layer) => layer.id === "roadEvents"))
      .toMatchObject({ availability: "available", defaultVisible: false });
    expect(trafficLayerCatalog.filter((layer) => layer.defaultVisible)).toHaveLength(0);
  });
});
