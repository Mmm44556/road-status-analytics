import booleanIntersects from '@turf/boolean-intersects';
import { feature } from '@turf/helpers';
import {
  getCountyBoundaries,
  type CountySelection,
} from '@/service/map/features/countyBoundaries';
import type { RouteResult } from '@/service/routeApi';

/** 依路線 geometry 找出實際經過的縣市，供路線模式查詢圖層。 */
export function getRouteCounties(
  geometry: RouteResult['geometry'],
): CountySelection[] {
  const routeFeature = feature(geometry);
  return getCountyBoundaries()
    .filter((county) => booleanIntersects(routeFeature, feature(county.geometry)))
    .map(({ id, name }) => ({ id, name }));
}
