import { describe, expect, it } from 'vitest';
import {
  createClusterExpansionCoordinates,
  shouldExpandCluster,
} from '@/service/map/shared/clusterExpansion';

describe('shouldExpandCluster', () => {
  it('expands members when the configured maximum zoom is reached', () => {
    expect(
      shouldExpandCluster({
        extent: [0, 0, 100, 100],
        resolution: 1,
        zoom: 17,
        maxZoom: 17,
      }),
    ).toBe(true);
  });

  it('expands members that share the same or nearly identical coordinate', () => {
    expect(
      shouldExpandCluster({
        extent: [100, 100, 100, 100],
        resolution: 2,
        zoom: 12,
        maxZoom: 17,
      }),
    ).toBe(true);
  });

  it('keeps zooming when members can still be separated', () => {
    expect(
      shouldExpandCluster({
        extent: [0, 0, 120, 80],
        resolution: 2,
        zoom: 12,
        maxZoom: 17,
      }),
    ).toBe(false);
  });
});

describe('createClusterExpansionCoordinates', () => {
  it('places every member around the cluster center', () => {
    const coordinates = createClusterExpansionCoordinates(4, [100, 200], 2);

    expect(coordinates).toHaveLength(4);
    coordinates.forEach(([x, y]) => {
      expect(Math.hypot(x - 100, y - 200)).toBeCloseTo(70);
    });
    expect(new Set(coordinates.map(String)).size).toBe(4);
  });

  it('returns no coordinates for an empty cluster', () => {
    expect(createClusterExpansionCoordinates(0, [0, 0], 1)).toEqual([]);
  });
});
