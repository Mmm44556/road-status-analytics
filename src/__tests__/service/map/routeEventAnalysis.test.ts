import { describe, expect, it } from 'vitest';
import {
  analyzeRouteEvents,
  DEFAULT_ROUTE_EVENT_BUFFER_METERS,
  filterPointsNearRoute,
} from '@/service/map/features/routeEventAnalysis';
import type { RoadEventMapPoint } from '@/service/map/features/mapFeatures';

const createEvent = (
  eventId: string,
  latitude: number,
  eventType: number,
): RoadEventMapPoint => ({
  objectId: 1,
  eventId,
  eventTitle: eventId,
  description: '',
  eventType,
  eventSubType: eventType * 100 + 1,
  location: '測試路段',
  publishTime: '2026-08-31T10:00:00+08:00',
  sourceKind: 'live',
  longitude: 120.305,
  latitude,
});

describe('route event analysis', () => {
  const geometry = {
    type: 'MultiLineString' as const,
    coordinates: [[[120.3, 22.64], [120.31, 22.64]]] as [number, number][][],
  };

  it('includes events within the default route buffer', () => {
    const nearby = createEvent('nearby', 22.641, 1);
    const farAway = createEvent('far-away', 22.65, 2);

    const analysis = analyzeRouteEvents(geometry, [nearby, farAway]);

    expect(DEFAULT_ROUTE_EVENT_BUFFER_METERS).toBe(300);
    expect(analysis.events.map((event) => event.eventId)).toEqual(['nearby']);
  });

  it('groups nearby events by event type', () => {
    const analysis = analyzeRouteEvents(geometry, [
      createEvent('accident-1', 22.641, 1),
      createEvent('accident-2', 22.6415, 1),
      createEvent('construction', 22.642, 2),
    ]);

    expect(analysis.total).toBe(3);
    expect(analysis.counts).toEqual([
      { eventType: 1, label: '交通事故', count: 2 },
      { eventType: 2, label: '施工', count: 1 },
    ]);
  });

  it('returns an empty summary when no event is near the route', () => {
    const analysis = analyzeRouteEvents(geometry, [
      createEvent('far-away', 22.66, 3),
    ]);

    expect(analysis.total).toBe(0);
    expect(analysis.counts).toEqual([]);
  });

  it('filters any point layer with longitude and latitude', () => {
    const points = [
      { id: 'near', longitude: 120.305, latitude: 22.641 },
      { id: 'far', longitude: 120.305, latitude: 22.66 },
    ];

    expect(filterPointsNearRoute(geometry, points).map((point) => point.id)).toEqual([
      'near',
    ]);
  });
});
