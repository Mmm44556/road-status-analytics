import { describe, expect, it } from 'vitest';
import { trafficLayerGroups } from '@/data/trafficLayerGroups';
import { trafficLayerCatalog } from '@/data/trafficLayerCatalog';

describe('trafficLayerGroups', () => {
  it('classifies every traffic layer exactly once', () => {
    const groupedIds = trafficLayerGroups.flatMap((group) => group.layerIds);
    const catalogIds = trafficLayerCatalog.map((layer) => layer.id);

    expect(new Set(groupedIds).size).toBe(groupedIds.length);
    expect([...groupedIds].sort()).toEqual([...catalogIds].sort());
  });

  it('groups public transport and parking layers by user intent', () => {
    expect(
      trafficLayerGroups.find((group) => group.id === 'publicTransport')
        ?.layerIds,
    ).toEqual(['bikeShare', 'metro', 'bus']);
    expect(
      trafficLayerGroups.find((group) => group.id === 'parking')?.layerIds,
    ).toEqual(['parkingLots', 'parkingSegments']);
    expect(trafficLayerGroups.map((group) => group.label)).toEqual([
      '即時交通',
      '公共運輸',
      '停車',
    ]);
  });
});
