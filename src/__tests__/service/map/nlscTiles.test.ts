import { describe, expect, it } from "vitest";
import { createNlscTileUrlFn, getNlscTileUrl } from "@/service/map/shared/nlscTiles";

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

describe("createNlscTileUrlFn", () => {
  it("builds the URL against the requested basemap layer", () => {
    const getPhotoTileUrl = createNlscTileUrlFn("PHOTO2");
    expect(getPhotoTileUrl([12, 3421, 1776])).toBe(
      "https://wmts.nlsc.gov.tw/wmts/PHOTO2/default/GoogleMapsCompatible/12/1776/3421",
    );
  });

  it("returns undefined when OpenLayers has no tile coordinate", () => {
    const getPhotoTileUrl = createNlscTileUrlFn("PHOTO2");
    expect(getPhotoTileUrl(null)).toBeUndefined();
  });
});
