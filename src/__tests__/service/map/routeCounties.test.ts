import { describe, expect, it } from 'vitest';
import { getRouteCounties } from '@/service/map/features/routeCounties';

describe('route counties', () => {
  it('finds every county intersected by the route geometry', () => {
    const counties = getRouteCounties({
      type: 'MultiLineString',
      coordinates: [[
        [120.3014, 22.6273],
        [120.302, 22.6397],
      ]],
    });

    expect(counties.map((county) => county.name)).toEqual(['高雄市']);
  });

  it('returns multiple counties for a cross-county route', () => {
    const counties = getRouteCounties({
      type: 'MultiLineString',
      coordinates: [[
        [120.3014, 22.6273],
        [120.2133, 22.9912],
      ]],
    });

    expect(counties.map((county) => county.name)).toEqual(
      expect.arrayContaining(['高雄市', '臺南市']),
    );
  });
});
