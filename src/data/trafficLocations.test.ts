import { describe, expect, it } from "vitest";
import { findTrafficLocation } from "./trafficLocations";

describe("findTrafficLocation", () => {
  it("matches traditional 台 and 臺 spellings", () => {
    expect(findTrafficLocation("台中")?.name).toBe("臺中市");
  });

  it("returns undefined for an unsupported location", () => {
    expect(findTrafficLocation("不存在的地方")).toBeUndefined();
  });
});
