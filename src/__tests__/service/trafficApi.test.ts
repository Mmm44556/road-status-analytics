import { describe, expect, it } from 'vitest';
import { parseRoadEvents } from '@/service/trafficApi';

const event = {
  EventID: 'event-1',
  EventTitle: '道路施工',
  Description: '施工中',
  EventType: 2,
  EventSubType: 208,
  EventStep: 1,
  EffectiveTime: '2026-08-10T09:00:00+08:00',
  Positions: 'POINT (120.67 22.63)',
  LocationType: 0,
  Location: { Other: '高雄市' },
  Source: 'TDX',
  PublishTime: '2026-08-10T09:00:00+08:00',
  LastUpdateTime: '2026-08-10T09:01:00+08:00',
};

describe('road event API contract', () => {
  it('validates preview and live TDX road events', () => {
    const parsed = parseRoadEvents({
      data: {
        city: 'Kaohsiung',
        preview: {
          Events: [{
            ...event,
            ExpireTime: '2026-08-11T09:00:00+08:00',
            Geometry: 'POLYGON ((120 22,121 22,121 23,120 22))',
          }],
        },
        live: { LiveEvents: [event] },
      },
    });

    expect(parsed.data.preview.Events).toHaveLength(1);
    expect(parsed.data.live.LiveEvents).toHaveLength(1);
  });

  it('rejects malformed upstream events at the API boundary', () => {
    expect(() => parseRoadEvents({
      data: {
        city: 'Kaohsiung',
        preview: { Events: [{}] },
        live: { LiveEvents: [] },
      },
    })).toThrow();
  });
});
