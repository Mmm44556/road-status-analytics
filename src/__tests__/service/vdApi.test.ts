import { describe, expect, it } from 'vitest';
import { parseVdReading, parseVds } from '@/service/vdApi';

describe('VD API contract', () => {
  it('accepts a merged VD record with live readings', () => {
    const parsed = parseVds({
      data: {
        city: 'Kaohsiung',
        vds: [{
          vdId: 'V000241',
          positionLon: 120.3202,
          positionLat: 22.68382,
          roadName: '民族一路',
          roadSection: { start: '華夏路(南)', end: '重愛路(南)' },
          links: [{
            linkId: '6196780000010E',
            roadDirection: 'N',
            laneCount: 2,
            averageSpeed: 42.5,
            averageOccupancy: 5.0,
          }],
        }],
      },
    });

    expect(parsed.data.vds[0].vdId).toBe('V000241');
  });

  it('accepts a link with no live readings (null speed/occupancy)', () => {
    const parsed = parseVds({
      data: {
        city: 'Kaohsiung',
        vds: [{
          vdId: 'V1',
          positionLon: 120.3,
          positionLat: 22.6,
          roadName: '測試路',
          roadSection: { start: '', end: '' },
          links: [{
            linkId: 'link-1',
            roadDirection: 'S',
            laneCount: null,
            averageSpeed: null,
            averageOccupancy: null,
          }],
        }],
      },
    });

    expect(parsed.data.vds[0].links[0].averageSpeed).toBeNull();
  });

  it('accepts a congestion level derived from VD speed', () => {
    const parsed = parseVds({
      data: {
        city: 'Kaohsiung',
        vds: [{
          vdId: 'V1',
          positionLon: 120.3,
          positionLat: 22.6,
          roadName: '測試路',
          roadSection: { start: '', end: '' },
          links: [{
            linkId: 'link-1',
            roadDirection: 'S',
            laneCount: 2,
            averageSpeed: 42.5,
            averageOccupancy: 5.0,
            congestionLevel: 1,
          }],
        }],
      },
    });

    expect(parsed.data.vds[0].links[0].congestionLevel).toBe(1);
  });

  it('rejects malformed upstream VD records at the API boundary', () => {
    expect(() => parseVds({
      data: { city: 'Kaohsiung', vds: [{}] },
    })).toThrow();
  });
});

describe('single-VD reload API contract', () => {
  it('accepts a single refreshed VD reading', () => {
    const parsed = parseVdReading({
      data: {
        vdId: 'V000241',
        positionLon: 120.3202,
        positionLat: 22.68382,
        roadName: '民族一路',
        roadSection: { start: '華夏路(南)', end: '重愛路(南)' },
        links: [{
          linkId: '6196780000010E',
          roadDirection: 'N',
          laneCount: 2,
          averageSpeed: 42.5,
          averageOccupancy: 5.0,
        }],
      },
    });

    expect(parsed.data.vdId).toBe('V000241');
  });

  it('rejects a malformed single-VD response', () => {
    expect(() => parseVdReading({ data: {} })).toThrow();
  });
});
