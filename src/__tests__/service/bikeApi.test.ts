import { describe, expect, it } from 'vitest';
import { parseBikeStation, parseBikeStations } from '@/service/bikeApi';

describe('YouBike API contract', () => {
  it('accepts a merged station with live availability', () => {
    const parsed = parseBikeStations({
      data: {
        city: 'Kaohsiung',
        stations: [{
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
        }],
      },
    });

    expect(parsed.data.stations[0].stationId).toBe('KHH501201001');
  });

  it('accepts a station with no live availability (null fields)', () => {
    const parsed = parseBikeStations({
      data: {
        city: 'Kaohsiung',
        stations: [{
          stationId: 's1',
          name: '測試站',
          address: '',
          positionLon: 120.3,
          positionLat: 22.6,
          capacity: null,
          serviceStatus: null,
          availableRentBikes: null,
          availableReturnBikes: null,
          availableElectricBikes: null,
        }],
      },
    });

    expect(parsed.data.stations[0].availableRentBikes).toBeNull();
  });

  it('rejects malformed upstream station records at the API boundary', () => {
    expect(() => parseBikeStations({
      data: { city: 'Kaohsiung', stations: [{}] },
    })).toThrow();
  });
});

describe('single-station reload API contract', () => {
  it('accepts a single refreshed station', () => {
    const parsed = parseBikeStation({
      data: {
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
      },
    });

    expect(parsed.data.stationId).toBe('KHH501201001');
  });

  it('rejects a malformed single-station response', () => {
    expect(() => parseBikeStation({ data: {} })).toThrow();
  });
});
