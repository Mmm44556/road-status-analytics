import { describe, expect, it } from 'vitest';
import { parseParkingSegment, parseParkingSegments } from '@/service/parkingSegmentApi';

describe('路邊停車格 API contract', () => {
  it('accepts a merged segment with live availability', () => {
    const parsed = parseParkingSegments({
      data: {
        city: 'Kaohsiung',
        segments: [{
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
        }],
      },
    });

    expect(parsed.data.segments[0].segmentId).toBe('001');
  });

  it('accepts a segment with no live availability (null fields)', () => {
    const parsed = parseParkingSegments({
      data: {
        city: 'Kaohsiung',
        segments: [{
          segmentId: 's1',
          name: '測試路段',
          description: '',
          positionLon: 120.3,
          positionLat: 22.6,
          fareDescription: '',
          totalSpaces: null,
          availableSpaces: null,
          serviceStatus: null,
          updateTime: null,
        }],
      },
    });

    expect(parsed.data.segments[0].availableSpaces).toBeNull();
  });

  it('rejects malformed upstream segment records at the API boundary', () => {
    expect(() => parseParkingSegments({
      data: { city: 'Kaohsiung', segments: [{}] },
    })).toThrow();
  });
});

describe('single-segment reload API contract', () => {
  it('accepts a single refreshed segment', () => {
    const parsed = parseParkingSegment({
      data: {
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
      },
    });

    expect(parsed.data.segmentId).toBe('001');
  });

  it('rejects a malformed single-segment response', () => {
    expect(() => parseParkingSegment({ data: {} })).toThrow();
  });
});
