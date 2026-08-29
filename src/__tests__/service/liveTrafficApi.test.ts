import { describe, expect, it } from 'vitest';
import { parseLiveTraffic } from '@/service/liveTrafficApi';

describe('live traffic API contract', () => {
  it('accepts a normalized TDX road segment', () => {
    const parsed = parseLiveTraffic({
      data: {
        city: 'Kaohsiung',
        updatedAt: '2026-08-29T18:00:00+08:00',
        segments: [{
          sectionId: 'section-1',
          roadName: '台17線',
          sectionName: '台17線測試路段',
          roadDirection: 'S',
          coordinates: [[120.3, 22.6], [120.31, 22.61]],
          travelSpeed: 28,
          travelTime: 60,
          congestionLevel: 3,
          dataCollectTime: '2026-08-29T18:00:00+08:00',
          source: 'Highway',
        }],
      },
    });

    expect(parsed.data.segments[0].roadName).toBe('台17線');
  });

  it('accepts a VD-derived city road segment', () => {
    const parsed = parseLiveTraffic({
      data: {
        city: 'Kaohsiung',
        updatedAt: '2026-08-29T18:00:00+08:00',
        segments: [{
          sectionId: 'city-1',
          roadName: '民族一路',
          sectionName: '民族一路測試路段',
          roadDirection: 'S',
          coordinates: [[120.3, 22.6], [120.31, 22.61]],
          travelSpeed: 20,
          travelTime: null,
          congestionLevel: 2,
          dataCollectTime: '2026-08-29T18:00:00+08:00',
          source: 'VD',
        }],
      },
    });

    expect(parsed.data.segments[0].source).toBe('VD');
  });

  it('rejects a line with fewer than two coordinates', () => {
    expect(() => parseLiveTraffic({
      data: {
        city: 'Kaohsiung',
        updatedAt: '',
        segments: [{
          sectionId: 'broken', roadName: '', sectionName: '', roadDirection: '',
          coordinates: [[120.3, 22.6]], congestionLevel: 1,
          dataCollectTime: '', source: 'Highway',
        }],
      },
    })).toThrow();
  });
});
