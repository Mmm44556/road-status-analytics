import type { TileCoord } from "ol/tilecoord";

const NLSC_EMAP_URL =
  "https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible";

export function getNlscTileUrl(tileCoord: TileCoord | null) {
  if (!tileCoord) return undefined;
  const [zoom, column, row] = tileCoord;
  return `${NLSC_EMAP_URL}/${zoom}/${row}/${column}`;
}
