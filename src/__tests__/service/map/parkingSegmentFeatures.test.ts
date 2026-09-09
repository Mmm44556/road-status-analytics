import { describe, expect, it } from 'vitest';
import { parkingSegmentsToMapPoints } from '@/service/map/features/parkingSegmentFeatures';
import type { ParkingSegment } from '@/service/parkingSegmentApi';

const baseSegment: ParkingSegment = {
  segmentId: '001',
  name: '建軍路',
  description: '.',
  positionLon: 120.3042224,
  positionLat: 22.6636242,
  fareDescription: '半時計15',
  totalSpaces: 33,
  availableSpaces: 3,
  serviceStatus: 1,
  updateTime: '2026-08-29T23:02:05+08:00',
};

describe('路邊停車格 map features', () => {
  it('converts a segment record into a map point', () => {
    expect(parkingSegmentsToMapPoints([baseSegment])).toEqual([{
      id: '001',
      longitude: 120.3042224,
      latitude: 22.6636242,
      name: '建軍路',
      description: '.',
      fareDescription: '半時計15',
      totalSpaces: 33,
      availableSpaces: 3,
      serviceStatus: 1,
      updateTime: '2026-08-29T23:02:05+08:00',
    }]);
  });

  it('ignores out-of-range coordinates', () => {
    expect(parkingSegmentsToMapPoints([{ ...baseSegment, positionLon: 999 }])).toHaveLength(0);
  });

  it('ignores segments with missing coordinates', () => {
    expect(parkingSegmentsToMapPoints([{ ...baseSegment, positionLon: null, positionLat: null }]))
      .toHaveLength(0);
  });

  it('removes duplicate segment IDs', () => {
    expect(parkingSegmentsToMapPoints([baseSegment, baseSegment])).toHaveLength(1);
  });

  it('defaults missing live fields to null instead of 0', () => {
    const offline: ParkingSegment = {
      ...baseSegment,
      segmentId: 's2',
      totalSpaces: null,
      availableSpaces: null,
      serviceStatus: null,
      updateTime: null,
    };

    expect(parkingSegmentsToMapPoints([offline])[0]).toMatchObject({
      totalSpaces: null,
      availableSpaces: null,
    });
  });
});
