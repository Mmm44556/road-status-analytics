import type { TileCoord } from "ol/tilecoord";

const NLSC_EMAP_URL =
  "https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible";

/** 將 OpenLayers 圖磚座標轉成 NLSC WMTS 網址。 */
export function getNlscTileUrl(tileCoord: TileCoord | null) {
  if (!tileCoord) return undefined;
  const [zoom, column, row] = tileCoord;
  // NLSC WMTS 路徑順序是 zoom／row／column。
  return `${NLSC_EMAP_URL}/${zoom}/${row}/${column}`;
}
