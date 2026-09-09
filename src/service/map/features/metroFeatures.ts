import type { MetroNextTrain, MetroStation } from '@/service/metroApi';
import { isCoordinate } from '@/service/map/features/mapFeatures';

export type MetroMapPoint = {
  id: string;
  longitude: number;
  latitude: number;
  name: string;
  system: string;
  nextTrains: MetroNextTrain[];
  updateTime: string | null;
};

/** 將後端合併後的捷運／輕軌站點轉成可繪製的地圖點位：過濾非法座標並依站點 ID 去重。 */
export function metroStationsToMapPoints(stations: MetroStation[]): MetroMapPoint[] {
  const points: MetroMapPoint[] = [];
  const seenIds = new Set<string>();

  for (const station of stations) {
    if (seenIds.has(station.stationId)) continue;
    if (station.positionLon == null || station.positionLat == null) continue;
    if (!isCoordinate(station.positionLon, station.positionLat)) continue;
    seenIds.add(station.stationId);
    points.push({
      id: station.stationId,
      longitude: station.positionLon,
      latitude: station.positionLat,
      name: station.name,
      system: station.system,
      nextTrains: station.nextTrains,
      updateTime: station.updateTime ?? null,
    });
  }

  return points;
}
