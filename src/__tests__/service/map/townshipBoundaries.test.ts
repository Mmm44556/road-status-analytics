import { describe, expect, it } from 'vitest';
import { getTownshipBoundaries } from '@/service/map/features/townshipBoundaries';

describe('getTownshipBoundaries', () => {
  it('returns townships belonging to the selected county', async () => {
    const kaohsiung = await getTownshipBoundaries('64000');

    expect(kaohsiung).toHaveLength(38);
    expect(kaohsiung.map((township) => township.name)).toContain('旗津區');
    expect(kaohsiung.every((township) => township.countyId === '64000')).toBe(
      true,
    );
  });

  it('covers all 368 townships and returns an empty list for unknown counties', async () => {
    const countyIds = [
      '09007', '09020', '10002', '10004', '10005', '10007', '10008',
      '10009', '10010', '10013', '10014', '10015', '10016', '10017',
      '10018', '10020', '63000', '64000', '65000', '66000', '67000', '68000',
    ];
    const counties = await Promise.all(
      countyIds.map((countyId) => getTownshipBoundaries(countyId)),
    );
    const total = counties.reduce((count, townships) => count + townships.length, 0);

    expect(total).toBe(368);
    expect(await getTownshipBoundaries('unknown')).toEqual([]);
  });
});
