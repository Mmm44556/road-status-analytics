import type { TrafficLayerId } from '@/data/trafficLayerCatalog';
import type { RouteTravelMode } from '@/service/routeApi';

export type MapQueryMode = 'area' | 'route';

export const routeModeLayerIds: readonly TrafficLayerId[] = [
  'roadEvents',
  'cctv',
  'vehicleDetectors',
  'bikeShare',
  'metro',
  'bus',
];

const drivingRouteLayerIds: readonly TrafficLayerId[] = [
  'roadEvents',
  'cctv',
  'vehicleDetectors',
];

/** 建立路線模式預設開啟的圖層集合。 */
export function getRouteModeVisibleLayers(
  travelMode: RouteTravelMode = 'drive',
): Set<TrafficLayerId> {
  if (travelMode === 'transit') return new Set(routeModeLayerIds);
  return new Set(drivingRouteLayerIds);
}

/** 判斷目前模式與查詢條件是否允許操作指定圖層。 */
export function canToggleLayerInQueryMode(
  mode: MapQueryMode,
  layerId: TrafficLayerId,
  isAreaSelectionComplete: boolean,
  hasRouteCities: boolean,
): boolean {
  if (mode === 'area') return isAreaSelectionComplete;
  return hasRouteCities && routeModeLayerIds.includes(layerId);
}
