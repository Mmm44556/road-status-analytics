export function parseWKTPolygon(wkt: string) {
  // 只支援 POLYGON
  const match = wkt.match(/POLYGON\s*\(\((.+)\)\)/i);
  if (!match) return null;
  // 取出座標字串
  const coordsStr = match[1];
  // 分割每個點
  const points = coordsStr.split(",").map((pt) => {
    const [lng, lat] = pt.trim().split(/\s+/).map(Number);
    return [lng, lat];
  });
  return points;
}
