import type { TrafficLayerId } from '@/data/trafficLayerCatalog';

export type TrafficLayerGroup = {
  id: 'traffic' | 'publicTransport' | 'parking';
  label: string;
  layerIds: TrafficLayerId[];
};

/** 依使用情境組織 Header 圖層選單。 */
export const trafficLayerGroups: TrafficLayerGroup[] = [
  {
    id: 'traffic',
    label: '即時交通',
    layerIds: ['liveTraffic', 'roadEvents', 'cctv', 'vehicleDetectors'],
  },
  {
    id: 'publicTransport',
    label: '公共運輸',
    layerIds: ['bikeShare', 'metro', 'bus'],
  },
  {
    id: 'parking',
    label: '停車',
    layerIds: ['parkingLots', 'parkingSegments'],
  },
];
