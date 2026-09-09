import { describe, expect, it } from 'vitest';
import { createConvexHull } from '@/service/map/shared/clusterHull';

describe('createConvexHull', () => {
  it('returns a closed polygon around the outer coordinates', () => {
    expect(
      createConvexHull([
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0.5, 0.5],
      ]),
    ).toEqual([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ]);
  });

  it('returns null when fewer than three distinct coordinates exist', () => {
    expect(
      createConvexHull([
        [0, 0],
        [1, 1],
        [1, 1],
      ]),
    ).toBeNull();
  });
});
