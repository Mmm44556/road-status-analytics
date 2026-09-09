import type { ParkingSegment } from '@/service/parkingSegmentApi';
import { isCoordinate } from '@/service/map/features/mapFeatures';

export type ParkingSegmentMapPoint = {
  id: string;
  longitude: number;
  latitude: number;
  name: string;
  description: string;
  fareDescription: string;
  totalSpaces: number | null;
  availableSpaces: number | null;
  serviceStatus: number | null;
  updateTime: string | null;
};

/** 將後端合併後的路邊停車格轉成可繪製的地圖點位：過濾非法座標並依路段 ID 去重。 */
export function parkingSegmentsToMapPoints(segments: ParkingSegment[]): ParkingSegmentMapPoint[] {
  const points: ParkingSegmentMapPoint[] = [];
  const seenIds = new Set<string>();

  for (const segment of segments) {
    if (seenIds.has(segment.segmentId)) continue;
    if (segment.positionLon == null || segment.positionLat == null) continue;
    if (!isCoordinate(segment.positionLon, segment.positionLat)) continue;
    seenIds.add(segment.segmentId);
    points.push({
      id: segment.segmentId,
      longitude: segment.positionLon,
      latitude: segment.positionLat,
      name: segment.name,
      description: segment.description,
      fareDescription: segment.fareDescription,
      totalSpaces: segment.totalSpaces ?? null,
      availableSpaces: segment.availableSpaces ?? null,
      serviceStatus: segment.serviceStatus ?? null,
      updateTime: segment.updateTime ?? null,
    });
  }

  return points;
}
