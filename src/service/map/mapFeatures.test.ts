import { describe, expect, it } from "vitest";
import { getWktRepresentativePoint, roadEventsToMapPoints } from "./mapFeatures";

describe("road event map features", () => {
  it("parses a WKT point", () => {
    expect(getWktRepresentativePoint("POINT (120.67 24.15)")).toEqual([120.67, 24.15]);
  });

  it("uses the polygon bounding-box center as its representative point", () => {
    expect(getWktRepresentativePoint("POLYGON ((120 24, 122 24, 122 26, 120 26, 120 24))")).toEqual([121, 25]);
  });

  it("ignores malformed or out-of-range coordinates", () => {
    expect(getWktRepresentativePoint("POINT (999 24)")).toBeNull();
    expect(getWktRepresentativePoint("not geometry")).toBeNull();
  });

  it("combines live and preview events while removing duplicate IDs", () => {
    const base = {
      EventID: "same-event", EventTitle: "施工", Description: "道路施工",
      EventType: 2, EventSubType: 207, EventStep: 1,
      EffectiveTime: "2026-08-10T00:00:00+08:00", Positions: "POINT (120.67 24.15)",
      LocationType: 0, Location: { Other: "臺中市" }, Source: "TDX",
      PublishTime: "2026-08-10T00:00:00+08:00", LastUpdateTime: "2026-08-10T00:00:00+08:00",
    };

    const points = roadEventsToMapPoints(
      [{ ...base, ExpireTime: "2026-08-11T00:00:00+08:00", Geometry: "POLYGON ((120 24,121 24,121 25,120 24))" }],
      [base],
    );

    expect(points).toHaveLength(1);
    expect(points[0]).toMatchObject({ eventId: "same-event", eventType: 2, sourceKind: "live" });
  });

  it("uses the preview event position even when its route geometry is a line", () => {
    const preview = {
      EventID: "preview-event", EventTitle: "活動", Description: "活動交維",
      EventType: 7, EventSubType: 798, EventStep: 1,
      EffectiveTime: "2026-08-10T00:00:00+08:00", ExpireTime: "2026-08-11T00:00:00+08:00",
      Positions: "POINT (120.68 24.16)", Geometry: "LINESTRING(120.67 24.15, 120.69 24.17)",
      LocationType: 0, Location: { Other: "臺中市" }, Source: "TDX",
      PublishTime: "2026-08-10T00:00:00+08:00", LastUpdateTime: "2026-08-10T00:00:00+08:00",
    };

    expect(roadEventsToMapPoints([preview], [])).toEqual([
      expect.objectContaining({ longitude: 120.68, latitude: 24.16, sourceKind: "preview" }),
    ]);
  });
});
