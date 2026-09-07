import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import booleanIntersects from '@turf/boolean-intersects';
import { lineString, point as turfPoint } from '@turf/helpers';
import type { TownshipSelection } from '@/service/map/features/townshipBoundaries';

export type CoordinatePoint = { longitude: number; latitude: number };

/** 判斷點位是否落在鄉鎮邊界內（支援 Polygon 與 MultiPolygon）。 */
export function isPointInsideTownship(
  point: CoordinatePoint,
  township: TownshipSelection,
): boolean {
  return booleanPointInPolygon(
    turfPoint([point.longitude, point.latitude]),
    township.geometry,
  );
}

/** 判斷路況線段是否與鄉鎮邊界相交，用真正的 geometry 相交而非 bounding box 比對。 */
export function doesLineIntersectTownship(
  coordinates: [number, number][],
  township: TownshipSelection,
): boolean {
  if (coordinates.length < 2) return false;
  return booleanIntersects(lineString(coordinates), township.geometry);
}
