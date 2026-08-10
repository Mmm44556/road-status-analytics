import { describe, expect, it } from "vitest";
import {
  getAccidentTypeTotals,
  getLatestPeriod,
  getTopCities,
  parseAccidentSummary,
  parseRoadEvents,
} from "./trafficApi";

const response = {
  data: [
    { date: "2026-07-01", city: "臺中市", A1: 1, A2: 10, A3: 20, total: 31, MM: "07", YYYY: "2026" },
    { date: "2026-07-02", city: "臺北市", A1: 2, A2: 5, A3: 8, total: 15, MM: "07", YYYY: "2026" },
    { date: "2026-07-03", city: "臺中市", A1: 0, A2: 3, A3: 6, total: 9, MM: "07", YYYY: "2026" },
    { date: "2026-08-01", city: "高雄市", A1: 9, A2: 9, A3: 9, total: 27, MM: "08", YYYY: "2026" },
  ],
};

describe("traffic API contract", () => {
  it("validates TDX preview and live road events", () => {
    const event = {
      EventID: "event-1", EventTitle: "道路施工", Description: "施工中",
      EventType: 2, EventSubType: 208, EventStep: 1,
      EffectiveTime: "2026-08-10T09:00:00+08:00", Positions: "POINT (120.67 24.15)",
      LocationType: 0, Location: { Other: "臺中市" }, Source: "TDX",
      PublishTime: "2026-08-10T09:00:00+08:00", LastUpdateTime: "2026-08-10T09:01:00+08:00",
    };
    const parsed = parseRoadEvents({
      data: {
        city: "Taichung",
        preview: { Events: [{ ...event, ExpireTime: "2026-08-11T09:00:00+08:00", Geometry: "POLYGON ((120 24,121 24,121 25,120 24))" }] },
        live: { LiveEvents: [event] },
      },
    });
    expect(parsed.data.preview.Events).toHaveLength(1);
    expect(parsed.data.live.LiveEvents).toHaveLength(1);
  });

  it("rejects malformed TDX road events", () => {
    expect(() => parseRoadEvents({ data: { city: "Taichung", preview: { Events: [{}] }, live: { LiveEvents: [] } } })).toThrow();
  });

  it("validates and returns the accident summary response", () => {
    expect(parseAccidentSummary(response)).toEqual(response);
  });

  it("rejects malformed API data at the boundary", () => {
    expect(() => parseAccidentSummary({ data: [{ city: "臺中市" }] })).toThrow();
  });

  it("rejects non-calendar period labels returned by a malformed feed", () => {
    expect(() =>
      parseAccidentSummary({
        data: [
          {
            date: "發生時間",
            city: "發生地",
            A1: 0,
            A2: 0,
            A3: 1,
            total: 1,
            MM: "",
            YYYY: "發生時間",
          },
        ],
      }),
    ).toThrow();
  });

  it("keeps valid records when a feed contains an invalid trailing row", () => {
    const parsed = parseAccidentSummary({
      data: [
        response.data[0],
        { ...response.data[0], MM: "", YYYY: "發生時間" },
      ],
    });
    expect(parsed.data).toEqual([response.data[0]]);
  });

  it("aggregates the top cities for a selected month", () => {
    expect(getTopCities(response.data, "2026", "07", 5)).toEqual([
      { city: "臺中市", count: 40 },
      { city: "臺北市", count: 15 },
    ]);
  });

  it("aggregates accident types for a selected month", () => {
    expect(getAccidentTypeTotals(response.data, "2026", "07")).toEqual({
      A1: 3,
      A2: 18,
      A3: 34,
    });
  });

  it("selects the latest period available from the API", () => {
    expect(getLatestPeriod(response.data)).toEqual({ year: "2026", month: "08" });
  });
});
