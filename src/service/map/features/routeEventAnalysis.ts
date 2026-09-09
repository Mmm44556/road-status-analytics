import { getRoadEventType } from '@/config/roadEventTypes';
import type { RoadEventMapPoint } from '@/service/map/features/mapFeatures';
import type { RouteResult } from '@/service/routeApi';

export const DEFAULT_ROUTE_EVENT_BUFFER_METERS = 300;
const EARTH_RADIUS_METERS = 6_371_008.8;

export type RouteEventAnalysis = {
  bufferMeters: number;
  total: number;
  events: RoadEventMapPoint[];
  counts: Array<{ eventType: number; label: string; count: number }>;
};

export type RouteEventAnalysisState =
  | { status: 'idle' | 'loading' | 'error' }
  | { status: 'ready'; analysis: RouteEventAnalysis };

type Coordinate = [number, number];
type GeographicPoint = { longitude: number; latitude: number };

/** 以事件位置為局部原點，計算點到經緯度線段的近似公尺距離。 */
function distanceToSegmentMeters(
  point: Coordinate,
  start: Coordinate,
  end: Coordinate,
): number {
  const latitudeRadians = (point[1] * Math.PI) / 180;
  const toLocalMeters = ([longitude, latitude]: Coordinate) => [
    ((longitude - point[0]) * Math.PI * EARTH_RADIUS_METERS *
      Math.cos(latitudeRadians)) /
      180,
    ((latitude - point[1]) * Math.PI * EARTH_RADIUS_METERS) / 180,
  ];
  const [startX, startY] = toLocalMeters(start);
  const [endX, endY] = toLocalMeters(end);
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  if (lengthSquared === 0) return Math.hypot(startX, startY);
  const ratio = Math.max(
    0,
    Math.min(1, -(startX * deltaX + startY * deltaY) / lengthSquared),
  );
  return Math.hypot(startX + ratio * deltaX, startY + ratio * deltaY);
}

/** 取得事件點到整條 MultiLineString 路線的最短距離。 */
function distanceToRouteMeters(
  point: Coordinate,
  lines: Coordinate[][],
): number {
  let minimumDistance = Number.POSITIVE_INFINITY;
  lines.forEach((line) => {
    for (let index = 1; index < line.length; index += 1) {
      minimumDistance = Math.min(
        minimumDistance,
        distanceToSegmentMeters(point, line[index - 1], line[index]),
      );
    }
  });
  return minimumDistance;
}

/** 篩選路線緩衝範圍內的交通事件，並依事件大類建立摘要。 */
export function analyzeRouteEvents(
  geometry: RouteResult['geometry'],
  events: RoadEventMapPoint[],
  bufferMeters = DEFAULT_ROUTE_EVENT_BUFFER_METERS,
): RouteEventAnalysis {
  const nearbyEvents = filterPointsNearRoute(geometry, events, bufferMeters);
  const countMap = new Map<number, number>();
  nearbyEvents.forEach((event) => {
    countMap.set(event.eventType, (countMap.get(event.eventType) ?? 0) + 1);
  });
  const counts = [...countMap.entries()]
    .map(([eventType, count]) => ({
      eventType,
      label: getRoadEventType(eventType).label,
      count,
    }))
    .sort((left, right) => right.count - left.count || left.eventType - right.eventType);
  return {
    bufferMeters,
    total: nearbyEvents.length,
    events: nearbyEvents,
    counts,
  };
}

/** 過濾路線緩衝範圍內的通用點圖層資料。 */
export function filterPointsNearRoute<T extends GeographicPoint>(
  geometry: RouteResult['geometry'],
  points: T[],
  bufferMeters = DEFAULT_ROUTE_EVENT_BUFFER_METERS,
): T[] {
  return points.filter((point) => {
    const distance = distanceToRouteMeters(
      [point.longitude, point.latitude],
      geometry.coordinates,
    );
    return distance <= bufferMeters;
  });
}
