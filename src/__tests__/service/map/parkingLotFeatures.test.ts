import { describe, expect, it } from 'vitest';
import { parkingLotsToMapPoints } from '@/service/map/features/parkingLotFeatures';
import type { ParkingLot } from '@/service/parkingLotApi';

const baseLot: ParkingLot = {
  lotId: 'KHA00001',
  name: '五都重平站停車場',
  address: '高雄市前鎮區鎮中路、翠亨北路口',
  positionLon: 120.32149,
  positionLat: 22.58779,
  fareDescription: '計次15元/次',
  isMotorcycle: false,
  totalSpaces: 54,
  availableSpaces: 15,
  serviceStatus: 1,
  updateTime: '2026-08-29T23:03:08+08:00',
};

describe('戶外停車場 map features', () => {
  it('converts a lot record into a map point', () => {
    expect(parkingLotsToMapPoints([baseLot])).toEqual([{
      id: 'KHA00001',
      longitude: 120.32149,
      latitude: 22.58779,
      name: '五都重平站停車場',
      address: '高雄市前鎮區鎮中路、翠亨北路口',
      fareDescription: '計次15元/次',
      isMotorcycle: false,
      totalSpaces: 54,
      availableSpaces: 15,
      serviceStatus: 1,
      updateTime: '2026-08-29T23:03:08+08:00',
    }]);
  });

  it('ignores out-of-range coordinates', () => {
    expect(parkingLotsToMapPoints([{ ...baseLot, positionLon: 999 }])).toHaveLength(0);
  });

  it('ignores lots with missing coordinates', () => {
    expect(parkingLotsToMapPoints([{ ...baseLot, positionLon: null, positionLat: null }]))
      .toHaveLength(0);
  });

  it('removes duplicate lot IDs', () => {
    expect(parkingLotsToMapPoints([baseLot, baseLot])).toHaveLength(1);
  });

  it('defaults missing live fields to null instead of 0', () => {
    const offline: ParkingLot = {
      ...baseLot,
      lotId: 's2',
      totalSpaces: null,
      availableSpaces: null,
      serviceStatus: null,
      updateTime: null,
    };

    expect(parkingLotsToMapPoints([offline])[0]).toMatchObject({
      totalSpaces: null,
      availableSpaces: null,
    });
  });
});
