import type { BusStop } from '@/service/busApi';
import { isCoordinate } from '@/service/map/features/mapFeatures';

export type BusMapPoint = {
  id: string;
  city: string;
  longitude: number;
  latitude: number;
  name: string;
  address: string;
  updateTime: string | null;
};

/** 將公車站牌轉成合法且不重複的地圖點位。 */
export function busStopsToMapPoints(
  stops: BusStop[],
  city = '',
): BusMapPoint[] {
  const seen = new Set<string>();
  return stops.flatMap((stop) => {
    if (seen.has(stop.stopId)) return [];
    if (!isCoordinate(stop.positionLon, stop.positionLat)) return [];
    seen.add(stop.stopId);
    return [{
      id: stop.stopId,
      city,
      longitude: stop.positionLon,
      latitude: stop.positionLat,
      name: stop.name,
      address: stop.address,
      updateTime: stop.updateTime ?? null,
    }];
  });
}
