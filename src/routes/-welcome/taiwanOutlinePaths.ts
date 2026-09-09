import { fromLonLat } from 'ol/proj';
import type { MultiPolygon, Polygon } from 'geojson';
import { getCountyBoundaries } from '@/service/map/features/countyBoundaries';

type Point = [number, number];
type Ring = Point[];

function getRings(geometry: Polygon | MultiPolygon): Ring[] {
  return geometry.type === 'Polygon'
    ? (geometry.coordinates as Ring[])
    : (geometry.coordinates as Ring[][]).flat();
}

export type CountyOutlinePath = {
  id: string;
  d: string;
};

export type TaiwanOutline = {
  countyPaths: CountyOutlinePath[];
  viewBoxSize: number;
  /** 把任意經緯度投影到同一份縣市外框的 SVG 座標系，供地標／路線疊加時對齊使用。 */
  projectLonLat: (lonLat: Point) => Point;
};

/**
 * 把縣市 TopoJSON 投影成裝飾用的 SVG 外框路徑（僅供介紹頁動畫，不帶互動）。
 * 沿用跟真實地圖相同的麥卡托投影（fromLonLat），維持形狀比例一致。
 */
export function getTaiwanOutline(
  viewBoxSize = 100,
  padding = 4,
): TaiwanOutline {
  const projectedCounties = getCountyBoundaries().map((county) => ({
    id: county.id,
    rings: getRings(county.geometry).map((ring) =>
      ring.map((coordinate) => fromLonLat(coordinate) as Point),
    ),
  }));

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const { rings } of projectedCounties) {
    for (const ring of rings) {
      for (const [x, y] of ring) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const scale = (viewBoxSize - padding * 2) / Math.max(spanX, spanY);
  const offsetX = (viewBoxSize - spanX * scale) / 2;
  const offsetY = (viewBoxSize - spanY * scale) / 2;

  const toSvgPoint = ([x, y]: Point): Point => [
    (x - minX) * scale + offsetX,
    // SVG 的 y 軸向下、麥卡托投影的 y 軸向上，這裡要翻轉。
    viewBoxSize - ((y - minY) * scale + offsetY),
  ];

  const countyPaths = projectedCounties.map(({ id, rings }) => ({
    id,
    d: rings
      .filter((ring) => ring.length > 0)
      .map((ring) => {
        const [first, ...rest] = ring.map(toSvgPoint);
        const line = rest.map(([x, y]) => `L${x.toFixed(2)},${y.toFixed(2)}`);
        return `M${first[0].toFixed(2)},${first[1].toFixed(2)}${line.join('')}Z`;
      })
      .join(' '),
  }));

  const projectLonLat = (lonLat: Point): Point =>
    toSvgPoint(fromLonLat(lonLat) as Point);

  return { countyPaths, viewBoxSize, projectLonLat };
}
