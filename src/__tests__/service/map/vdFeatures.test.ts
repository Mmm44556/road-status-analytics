import { describe, expect, it } from 'vitest';
import { vdsToMapPoints } from '@/service/map/features/vdFeatures';
import type { Vd } from '@/service/vdApi';

const baseVd: Vd = {
  vdId: 'V000241',
  positionLon: 120.3202,
  positionLat: 22.68382,
  roadName: '民族一路',
  roadSection: { start: '華夏路(南)', end: '重愛路(南)' },
  links: [{
    linkId: '6196780000010E',
    roadDirection: 'N',
    laneCount: 2,
    averageSpeed: 42.5,
    averageOccupancy: 5.0,
  }],
};

describe('VD map features', () => {
  it('converts a VD record into a map point', () => {
    expect(vdsToMapPoints([baseVd])).toEqual([{
      id: 'V000241',
      longitude: 120.3202,
      latitude: 22.68382,
      roadName: '民族一路',
      roadSection: { start: '華夏路(南)', end: '重愛路(南)' },
      links: baseVd.links,
    }]);
  });

  it('ignores out-of-range coordinates', () => {
    expect(vdsToMapPoints([{ ...baseVd, positionLon: 999 }])).toHaveLength(0);
  });

  it('removes duplicate VDIDs', () => {
    expect(vdsToMapPoints([baseVd, baseVd])).toHaveLength(1);
  });

  it('keeps VDs with multiple detection directions intact', () => {
    const biDirectional: Vd = {
      ...baseVd,
      links: [
        ...baseVd.links,
        { linkId: '6196780400010E', roadDirection: 'S', laneCount: 2, averageSpeed: null, averageOccupancy: null },
      ],
    };

    expect(vdsToMapPoints([biDirectional])[0].links).toHaveLength(2);
  });
});
