import { describe, expect, it } from 'vitest';
import { getClusterLevel } from '@/service/map/shared/clusterLevel';

describe('getClusterLevel', () => {
  it.each([
    [2, 'low'],
    [9, 'low'],
    [10, 'medium'],
    [49, 'medium'],
    [50, 'high'],
  ] as const)('classifies %i events as %s density', (count, level) => {
    expect(getClusterLevel(count).id).toBe(level);
  });
});
