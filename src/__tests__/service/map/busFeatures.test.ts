import { describe, expect, it } from 'vitest';
import { busStopsToMapPoints } from '@/service/map/features/busFeatures';

const stop = {
  stopId: 'KHH1001', name: '高雄車站', address: '建國二路',
  positionLon: 120.302, positionLat: 22.6397,
};

describe('公車站牌 map features', () => {
  it('converts valid stops and removes duplicate IDs', () => {
    expect(busStopsToMapPoints([stop, stop], 'Kaohsiung')).toEqual([{
      id: 'KHH1001', name: '高雄車站', address: '建國二路',
      city: 'Kaohsiung', longitude: 120.302, latitude: 22.6397, updateTime: null,
    }]);
  });

  it('ignores invalid coordinates', () => {
    expect(busStopsToMapPoints([{ ...stop, positionLon: 999 }])).toEqual([]);
  });
});
