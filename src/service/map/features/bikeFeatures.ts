import type { BikeStation } from '@/service/bikeApi';
import { isCoordinate } from '@/service/map/features/mapFeatures';

export type BikeMapPoint = {
  id: string;
  longitude: number;
  latitude: number;
  name: string;
  address: string;
  capacity: number | null;
  serviceStatus: number | null;
  availableRentBikes: number | null;
  availableReturnBikes: number | null;
  availableElectricBikes: number | null;
  updateTime: string | null;
};

/** 將後端合併後的 YouBike 站點轉成可繪製的地圖點位：過濾非法座標並依站點 ID 去重。 */
export function bikeStationsToMapPoints(stations: BikeStation[]): BikeMapPoint[] {
  const points: BikeMapPoint[] = [];
  const seenIds = new Set<string>();

  for (const station of stations) {
    if (seenIds.has(station.stationId)) continue;
    if (!isCoordinate(station.positionLon, station.positionLat)) continue;
    seenIds.add(station.stationId);
    points.push({
      id: station.stationId,
      longitude: station.positionLon,
      latitude: station.positionLat,
      name: station.name,
      address: station.address,
      capacity: station.capacity ?? null,
      serviceStatus: station.serviceStatus ?? null,
      availableRentBikes: station.availableRentBikes ?? null,
      availableReturnBikes: station.availableReturnBikes ?? null,
      availableElectricBikes: station.availableElectricBikes ?? null,
      updateTime: station.updateTime ?? null,
    });
  }

  return points;
}
