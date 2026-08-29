import { describe, expect, it } from 'vitest';
import { metroStationsToMapPoints } from '@/service/map/features/metroFeatures';
import type { MetroStation } from '@/service/metroApi';

const baseStation: MetroStation = {
  stationId: 'KRTC-O1',
  name: '哈瑪星',
  system: '捷運',
  positionLon: 120.274508,
  positionLat: 22.621492,
  nextTrains: [{ direction: '往大寮', estimateMinutes: 2 }],
  updateTime: '2026-08-29T21:56:34+08:00',
};

describe('捷運／輕軌 map features', () => {
  it('converts a station record into a map point', () => {
    expect(metroStationsToMapPoints([baseStation])).toEqual([{
      id: 'KRTC-O1',
      longitude: 120.274508,
      latitude: 22.621492,
      name: '哈瑪星',
      system: '捷運',
      nextTrains: [{ direction: '往大寮', estimateMinutes: 2 }],
      updateTime: '2026-08-29T21:56:34+08:00',
    }]);
  });

  it('ignores out-of-range coordinates', () => {
    expect(metroStationsToMapPoints([{ ...baseStation, positionLon: 999 }])).toHaveLength(0);
  });

  it('ignores stations with missing coordinates', () => {
    expect(metroStationsToMapPoints([{ ...baseStation, positionLon: null, positionLat: null }]))
      .toHaveLength(0);
  });

  it('removes duplicate station IDs', () => {
    expect(metroStationsToMapPoints([baseStation, baseStation])).toHaveLength(1);
  });

  it('keeps an empty nextTrains array as-is', () => {
    const noTrains: MetroStation = { ...baseStation, stationId: 's2', nextTrains: [] };
    expect(metroStationsToMapPoints([noTrains])[0]).toMatchObject({ nextTrains: [] });
  });
});
