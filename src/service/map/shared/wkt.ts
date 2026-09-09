/** 解析簡單 WKT POLYGON 並回傳經緯度陣列。 */
export function parseWKTPolygon(wkt: string) {
  // 目前只解析 TDX 使用的簡單 POLYGON。
  const match = wkt.match(/POLYGON\s*\(\((.+)\)\)/i);
  if (!match) return null;
  const coordsStr = match[1];
  const points = coordsStr.split(",").map((pt) => {
    const [lng, lat] = pt.trim().split(/\s+/).map(Number);
    return [lng, lat];
  });
  return points;
}
