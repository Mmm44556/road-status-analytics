import type { Coordinate } from 'ol/coordinate';
import { getHeight, getWidth, type Extent } from 'ol/extent';

const CIRCLE_FOOT_SEPARATION = 28;
const MINIMUM_RADIUS_IN_PIXELS = 35;
const CIRCLE_START_ANGLE = Math.PI / 2;

type ShouldExpandClusterOptions = {
  extent: Extent;
  resolution: number;
  zoom: number;
  maxZoom: number;
};

/** 判斷聚合是否已無法再透過縮放拆分。 */
export function shouldExpandCluster({
  extent,
  resolution,
  zoom,
  maxZoom,
}: ShouldExpandClusterOptions) {
  const isAtMaximumZoom = zoom >= maxZoom;
  const isWithinOnePixel =
    getWidth(extent) < resolution && getHeight(extent) < resolution;
  return isAtMaximumZoom || isWithinOnePixel;
}

/** 將重疊的聚合成員排列在中心點周圍，產生 spiderfy 顯示座標。 */
export function createClusterExpansionCoordinates(
  count: number,
  center: Coordinate,
  resolution: number,
) {
  if (count <= 0) return [];

  const circumference = CIRCLE_FOOT_SEPARATION * (2 + count);
  const radiusInPixels = Math.max(
    circumference / (Math.PI * 2),
    MINIMUM_RADIUS_IN_PIXELS,
  );
  const radius = radiusInPixels * resolution;
  const angleStep = (Math.PI * 2) / count;

  return Array.from({ length: count }, (_, index): Coordinate => {
    const angle = CIRCLE_START_ANGLE + index * angleStep;
    return [
      center[0] + radius * Math.cos(angle),
      center[1] + radius * Math.sin(angle),
    ];
  });
}
