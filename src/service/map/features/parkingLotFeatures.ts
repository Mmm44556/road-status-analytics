import type { ParkingLot } from '@/service/parkingLotApi';
import { isCoordinate } from '@/service/map/features/mapFeatures';

export type ParkingLotMapPoint = {
  id: string;
  longitude: number;
  latitude: number;
  name: string;
  address: string;
  fareDescription: string;
  isMotorcycle: boolean;
  totalSpaces: number | null;
  availableSpaces: number | null;
  serviceStatus: number | null;
  updateTime: string | null;
};

/** 將後端合併後的戶外停車場轉成可繪製的地圖點位：過濾非法座標並依停車場 ID 去重。 */
export function parkingLotsToMapPoints(lots: ParkingLot[]): ParkingLotMapPoint[] {
  const points: ParkingLotMapPoint[] = [];
  const seenIds = new Set<string>();

  for (const lot of lots) {
    if (seenIds.has(lot.lotId)) continue;
    if (lot.positionLon == null || lot.positionLat == null) continue;
    if (!isCoordinate(lot.positionLon, lot.positionLat)) continue;
    seenIds.add(lot.lotId);
    points.push({
      id: lot.lotId,
      longitude: lot.positionLon,
      latitude: lot.positionLat,
      name: lot.name,
      address: lot.address,
      fareDescription: lot.fareDescription,
      isMotorcycle: lot.isMotorcycle,
      totalSpaces: lot.totalSpaces ?? null,
      availableSpaces: lot.availableSpaces ?? null,
      serviceStatus: lot.serviceStatus ?? null,
      updateTime: lot.updateTime ?? null,
    });
  }

  return points;
}
