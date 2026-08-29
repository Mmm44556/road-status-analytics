import type { Vd, VdLink } from '@/service/vdApi';
import { isCoordinate } from '@/service/map/features/mapFeatures';

export type VdMapPoint = {
  id: string;
  longitude: number;
  latitude: number;
  roadName: string;
  roadSection: { start: string; end: string };
  links: VdLink[];
};

/** 將後端合併後的 VD 資料轉成可繪製的地圖點位：過濾非法座標並依 VDID 去重。 */
export function vdsToMapPoints(vds: Vd[]): VdMapPoint[] {
  const points: VdMapPoint[] = [];
  const seenIds = new Set<string>();

  for (const vd of vds) {
    if (seenIds.has(vd.vdId)) continue;
    if (!isCoordinate(vd.positionLon, vd.positionLat)) continue;
    seenIds.add(vd.vdId);
    points.push({
      id: vd.vdId,
      longitude: vd.positionLon,
      latitude: vd.positionLat,
      roadName: vd.roadName,
      roadSection: vd.roadSection,
      links: vd.links,
    });
  }

  return points;
}
