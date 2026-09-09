import { describe, expect, it } from 'vitest';
import { parseMetroStation, parseMetroStations } from '@/service/metroApi';

describe('捷運／輕軌 API contract', () => {
  it('accepts a merged station with next-train estimates', () => {
    const parsed = parseMetroStations({
      data: {
        city: 'Kaohsiung',
        stations: [{
          stationId: 'KRTC-O1',
          name: '哈瑪星',
          system: '捷運',
          positionLon: 120.274508,
          positionLat: 22.621492,
          nextTrains: [{ direction: '往大寮', estimateMinutes: 2 }],
          updateTime: '2026-08-29T21:56:34+08:00',
        }],
      },
    });

    expect(parsed.data.stations[0].stationId).toBe('KRTC-O1');
  });

  it('accepts a station with no live board data (empty nextTrains)', () => {
    const parsed = parseMetroStations({
      data: {
        city: 'Kaohsiung',
        stations: [{
          stationId: 's1',
          name: '測試站',
          system: '輕軌',
          positionLon: null,
          positionLat: null,
          nextTrains: [],
        }],
      },
    });

    expect(parsed.data.stations[0].nextTrains).toEqual([]);
  });

  it('rejects malformed upstream station records at the API boundary', () => {
    expect(() => parseMetroStations({
      data: { city: 'Kaohsiung', stations: [{}] },
    })).toThrow();
  });
});

describe('single-station reload API contract', () => {
  it('accepts a single refreshed station', () => {
    const parsed = parseMetroStation({
      data: {
        stationId: 'KRTC-O1',
        name: '哈瑪星',
        system: '捷運',
        positionLon: 120.274508,
        positionLat: 22.621492,
        nextTrains: [{ direction: '往大寮', estimateMinutes: 2 }],
        updateTime: '2026-08-29T21:56:34+08:00',
      },
    });

    expect(parsed.data.stationId).toBe('KRTC-O1');
  });

  it('rejects a malformed single-station response', () => {
    expect(() => parseMetroStation({ data: {} })).toThrow();
  });
});
