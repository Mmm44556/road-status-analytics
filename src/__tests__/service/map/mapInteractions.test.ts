import { describe, expect, it } from 'vitest';
import { getMapFeatureCursor } from '@/service/map/shared/mapInteractions';

describe('getMapFeatureCursor', () => {
  it('uses a pointer cursor over an interactive feature', () => {
    expect(getMapFeatureCursor(true)).toBe('pointer');
  });

  it('restores the default cursor outside features', () => {
    expect(getMapFeatureCursor(false)).toBe('');
  });
});
