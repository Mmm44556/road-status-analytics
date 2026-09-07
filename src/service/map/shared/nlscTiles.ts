import type { TileCoord } from "ol/tilecoord";
import { DEFAULT_BASEMAP_ID, type BasemapId } from "@/data/basemapCatalog";

const NLSC_WMTS_BASE_URL = "https://wmts.nlsc.gov.tw/wmts";

/** 建立指定底圖圖層的 NLSC WMTS 圖磚座標轉網址函式。 */
export function createNlscTileUrlFn(basemapId: BasemapId = DEFAULT_BASEMAP_ID) {
  return (tileCoord: TileCoord | null) => {
    if (!tileCoord) return undefined;
    const [zoom, column, row] = tileCoord;
    // NLSC WMTS 路徑順序是 zoom／row／column。
    return `${NLSC_WMTS_BASE_URL}/${basemapId}/default/GoogleMapsCompatible/${zoom}/${row}/${column}`;
  };
}

/** 將 OpenLayers 圖磚座標轉成 NLSC 通用電子地圖（EMAP）WMTS 網址。 */
export const getNlscTileUrl = createNlscTileUrlFn(DEFAULT_BASEMAP_ID);
