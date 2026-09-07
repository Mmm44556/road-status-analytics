import { describe, expect, it } from 'vitest';
import {
  getBusArrivalTimeLabel,
  parseBusArrivals,
  parseBusRouteShape,
  parseBusStops,
} from '@/service/busApi';

describe('公車站牌 API contract', () => {
  it('accepts normalized bus stops', () => {
    const parsed = parseBusStops({ data: { city: 'Kaohsiung', stops: [{
      stopId: 'KHH1001',
      name: '高雄車站',
      address: '建國二路',
      positionLon: 120.302,
      positionLat: 22.6397,
    }] } });
    expect(parsed.data.stops[0].stopId).toBe('KHH1001');
  });

  it('rejects malformed stops', () => {
    expect(() => parseBusStops({ data: { city: 'Kaohsiung', stops: [{}] } })).toThrow();
  });
});

describe('公車預估到站 API contract', () => {
  it('accepts normalized arrivals', () => {
    const parsed = parseBusArrivals({
      data: {
        city: 'Kaohsiung',
        stopId: 'KHH1001',
        arrivals: [{
          routeId: 'KHH100',
          routeName: '100',
          direction: 0,
          destination: '左營南站',
          estimateSeconds: 180,
          stopStatus: 0,
          plateNumber: 'ABC-123',
          nextBusTime: null,
          isLastBus: false,
          updateTime: '2026-09-02T10:00:00+08:00',
        }],
      },
    });

    expect(parsed.data.arrivals[0].destination).toBe('左營南站');
  });

  it('formats estimates and non-operating statuses', () => {
    expect(getBusArrivalTimeLabel({ estimateSeconds: 45, stopStatus: 0 }))
      .toBe('進站中');
    expect(getBusArrivalTimeLabel({ estimateSeconds: 180, stopStatus: 0 }))
      .toBe('3 分鐘');
    expect(getBusArrivalTimeLabel({ estimateSeconds: null, stopStatus: 3 }))
      .toBe('末班車已過');
    expect(getBusArrivalTimeLabel({ estimateSeconds: null, stopStatus: 4 }))
      .toBe('今日未營運');
  });
});

describe('公車路線行駛路徑 API contract', () => {
  it('accepts a normalized route shape', () => {
    const parsed = parseBusRouteShape({
      data: {
        city: 'Kaohsiung',
        routeId: 'KHH100',
        routeName: '100百貨幹線',
        direction: 0,
        coordinates: [[120.1, 22.1], [120.2, 22.2]],
        updateTime: '2026-09-03T00:00:00+08:00',
      },
    });

    expect(parsed.data.coordinates).toEqual([[120.1, 22.1], [120.2, 22.2]]);
  });

  it('rejects a malformed route shape response', () => {
    expect(() => parseBusRouteShape({ data: {} })).toThrow();
  });
});
