import { describe, expect, it } from 'vitest';
import { moveStopover, moveStopoverToIndex } from '@/routes/-maps/routeStopovers';

const stopovers = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

describe('route stopover ordering', () => {
  it('reorders a dragged stopover by its source and destination indexes', () => {
    expect(moveStopoverToIndex(stopovers, 2, 0).map(({ id }) => id)).toEqual([
      'c',
      'a',
      'b',
    ]);
    expect(moveStopoverToIndex(stopovers, 1, 1)).toBe(stopovers);
    expect(moveStopoverToIndex(stopovers, -1, 1)).toBe(stopovers);
  });

  it('moves a stopover by one position for keyboard controls', () => {
    expect(moveStopover(stopovers, 'b', -1).map(({ id }) => id)).toEqual([
      'b',
      'a',
      'c',
    ]);
    expect(moveStopover(stopovers, 'a', -1)).toBe(stopovers);
  });
});
