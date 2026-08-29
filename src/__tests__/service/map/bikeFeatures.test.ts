import { describe, expect, it } from 'vitest';
import { bikeStationsToMapPoints } from '@/service/map/features/bikeFeatures';
import type { BikeStation } from '@/service/bikeApi';

const baseStation: BikeStation = {
  stationId: 'KHH501201001',
  name: '捷運美麗島站(10號出口)',
  address: '中山一路168號前方',
  positionLon: 120.30212,
  positionLat: 22.63213,
  capacity: 23,
  serviceStatus: 1,
  availableRentBikes: 6,
  availableReturnBikes: 16,
  availableElectricBikes: 0,
  updateTime: '2026-08-29T00:47:03+08:00',
};

describe('YouBike map features', () => {
  it('converts a station record into a map point', () => {
    expect(bikeStationsToMapPoints([baseStation])).toEqual([{
      id: 'KHH501201001',
      longitude: 120.30212,
      latitude: 22.63213,
      name: '捷運美麗島站(10號出口)',
      address: '中山一路168號前方',
      capacity: 23,
      serviceStatus: 1,
      availableRentBikes: 6,
      availableReturnBikes: 16,
      availableElectricBikes: 0,
      updateTime: '2026-08-29T00:47:03+08:00',
    }]);
  });

  it('ignores out-of-range coordinates', () => {
    expect(bikeStationsToMapPoints([{ ...baseStation, positionLon: 999 }])).toHaveLength(0);
  });

  it('removes duplicate station IDs', () => {
    expect(bikeStationsToMapPoints([baseStation, baseStation])).toHaveLength(1);
  });

  it('defaults missing live fields to null instead of 0', () => {
    const offline: BikeStation = {
      ...baseStation,
      stationId: 's2',
      capacity: null,
      serviceStatus: null,
      availableRentBikes: null,
      availableReturnBikes: null,
      availableElectricBikes: null,
    };

    expect(bikeStationsToMapPoints([offline])[0]).toMatchObject({
      capacity: null,
      availableRentBikes: null,
    });
  });
});
