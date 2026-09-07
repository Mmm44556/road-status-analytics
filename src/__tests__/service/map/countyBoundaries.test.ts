import { describe, expect, it } from 'vitest';
import { getCountyBoundaries } from '@/service/map/features/countyBoundaries';

describe('getCountyBoundaries', () => {
  it('returns the 22 selectable Taiwan counties with stable identities', () => {
    const counties = getCountyBoundaries();

    expect(counties).toHaveLength(22);
    expect(new Set(counties.map((county) => county.id)).size).toBe(22);
    expect(counties.map((county) => county.name)).toContain('高雄市');
    expect(counties.map((county) => county.name)).toContain('連江縣');
    expect(
      counties.every(
        (county) =>
          county.geometry.type === 'Polygon' ||
          county.geometry.type === 'MultiPolygon',
      ),
    ).toBe(true);
  });
});
