import {
  trafficLayerCatalog,
  type TrafficLayerId,
} from '@/data/trafficLayerCatalog';

/** 將圖層 catalog 的 SVG path 轉成 OpenLayers 圖示網址。 */
export function getTrafficLayerIconDataUrl(
  layerId: TrafficLayerId,
  color: string,
) {
  const layer = trafficLayerCatalog.find((item) => item.id === layerId);
  if (!layer) throw new Error(`Unknown traffic layer: ${layerId}`);

  const markup = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"',
    ` fill="${color}"><path d="${layer.mapIconPath}"/></svg>`,
  ].join('');
  return `data:image/svg+xml,${encodeURIComponent(markup)}`;
}
