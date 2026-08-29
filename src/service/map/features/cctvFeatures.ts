import type { Cctv } from '@/service/cctvApi';
import { isCoordinate } from '@/service/map/features/mapFeatures';

export type CctvStreamKind =
  | 'image'
  | 'hls'
  | 'hls-page'
  | 'flv-websocket'
  | 'unsupported';

export type CctvCameraView = {
  id: string;
  roadName: string;
  roadDirection: string;
  description: string;
  streamUrl: string;
  imageUrl: string;
  streamKind: Exclude<CctvStreamKind, 'unsupported'>;
  locationType: number;
};

export type CctvMapPoint = {
  id: string;
  longitude: number;
  latitude: number;
  /** 同一路口常見多支不同方向的攝影機，座標幾乎重疊，故合併成同一點位。 */
  cameras: CctvCameraView[];
};

/** 座標在此距離內視為同一個路口／地點，用來合併不同方向的攝影機。 */
const SAME_LOCATION_METERS = 30;
const METERS_PER_LATITUDE_DEGREE = 111_320;
const TAIWAN_CENTER_LATITUDE_RADIANS = (23.7 * Math.PI) / 180;

/** 依串流網址判斷前端應使用的影像播放器。 */
export function getCctvStreamKind(streamUrl: string): CctvStreamKind {
  try {
    const url = new URL(streamUrl);
    const protocol = url.protocol.toLowerCase();
    const pathname = url.pathname.toLowerCase();

    if (['http:', 'https:'].includes(protocol) && pathname.endsWith('.m3u8')) {
      return 'hls';
    }
    if (
      ['http:', 'https:'].includes(protocol) &&
      pathname.endsWith('/cgi-bin/live.cgi')
    ) {
      return 'hls-page';
    }
    if (['ws:', 'wss:'].includes(protocol) && pathname.includes('/flv/')) {
      return 'flv-websocket';
    }
    if (['http:', 'https:'].includes(protocol)) return 'image';
  } catch {
    return 'unsupported';
  }

  return 'unsupported';
}

/** 計算兩經緯度座標間的地表距離（公尺）。 */
function haversineMeters(
  [lon1, lat1]: readonly [number, number],
  [lon2, lat2]: readonly [number, number],
): number {
  const earthRadiusMeters = 6371000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const sinHalfLat = Math.sin(dLat / 2);
  const sinHalfLon = Math.sin(dLon / 2);
  const h =
    sinHalfLat * sinHalfLat +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      sinHalfLon *
      sinHalfLon;
  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(h));
}

type PositionedCamera = CctvCameraView & {
  longitude: number;
  latitude: number;
};

const getSpatialCell = (camera: PositionedCamera) => [
  Math.floor(
    (camera.longitude * METERS_PER_LATITUDE_DEGREE *
      Math.cos(TAIWAN_CENTER_LATITUDE_RADIANS)) /
      SAME_LOCATION_METERS,
  ),
  Math.floor(
    (camera.latitude * METERS_PER_LATITUDE_DEGREE) / SAME_LOCATION_METERS,
  ),
] as const;

/** 將 TDX CCTV 點位轉成可繪製的地圖點位：過濾非法座標、依 CCTVID 去重，並合併同路口的攝影機。 */
export function cctvsToMapPoints(
  cctvs: Cctv[],
  getImageUrl: (cameraId: string) => string = (cameraId) => cameraId,
): CctvMapPoint[] {
  const cameras: PositionedCamera[] = [];
  const seenIds = new Set<string>();

  for (const cctv of cctvs) {
    if (seenIds.has(cctv.CCTVID)) continue;
    if (!isCoordinate(cctv.PositionLon, cctv.PositionLat)) continue;
    const streamKind = getCctvStreamKind(cctv.VideoStreamURL);
    if (streamKind === 'unsupported') continue;
    seenIds.add(cctv.CCTVID);
    cameras.push({
      id: cctv.CCTVID,
      roadName: cctv.RoadName ?? '',
      roadDirection: cctv.RoadDirection ?? '',
      description: cctv.SurveillanceDescription ?? '',
      streamUrl: cctv.VideoStreamURL,
      imageUrl: getImageUrl(cctv.CCTVID),
      streamKind,
      locationType: cctv.LocationType,
      longitude: cctv.PositionLon,
      latitude: cctv.PositionLat,
    });
  }

  // LinkID 是具方向性的路段索引，不能用來判定攝影機是否位於同一地點。
  // 以空間網格只比較相鄰格，避免大量點位互相比對造成 O(n²)。
  const groups: { anchor: PositionedCamera; cameras: PositionedCamera[] }[] = [];
  const spatialGrid = new Map<string, number[]>();
  for (const camera of cameras) {
    const [cellX, cellY] = getSpatialCell(camera);
    const candidateGroupIndexes: number[] = [];
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        candidateGroupIndexes.push(
          ...(spatialGrid.get(`${cellX + offsetX}:${cellY + offsetY}`) ?? []),
        );
      }
    }
    const groupIndex = candidateGroupIndexes
      .sort((a, b) => a - b)
      .find((index) => {
        const anchor = groups[index].anchor;
        return (
          haversineMeters(
            [anchor.longitude, anchor.latitude],
            [camera.longitude, camera.latitude],
          ) <= SAME_LOCATION_METERS
        );
      });

    if (groupIndex !== undefined) {
      groups[groupIndex].cameras.push(camera);
      continue;
    }
    const nextGroupIndex = groups.length;
    groups.push({ anchor: camera, cameras: [camera] });
    const cellKey = `${cellX}:${cellY}`;
    spatialGrid.set(cellKey, [
      ...(spatialGrid.get(cellKey) ?? []),
      nextGroupIndex,
    ]);
  }

  return groups.map(({ anchor, cameras: group }) => ({
      id: anchor.id,
      longitude: anchor.longitude,
      latitude: anchor.latitude,
      cameras: group.map((camera) => ({
        id: camera.id,
        roadName: camera.roadName,
        roadDirection: camera.roadDirection,
        description: camera.description,
        streamUrl: camera.streamUrl,
        imageUrl: camera.imageUrl,
        streamKind: camera.streamKind,
        locationType: camera.locationType,
      })),
    }));
}
