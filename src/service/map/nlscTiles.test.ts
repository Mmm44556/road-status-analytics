import { describe, expect, it } from "vitest";
import { getNlscTileUrl } from "./nlscTiles";

describe("NLSC tile URL", () => {
  it("uses the WMTS z/y/x path order", () => {
    expect(getNlscTileUrl([12, 3421, 1776])).toBe(
      "https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/12/1776/3421",
    );
  });

  it("returns undefined when OpenLayers has no tile coordinate", () => {
    expect(getNlscTileUrl(null)).toBeUndefined();
  });
});
