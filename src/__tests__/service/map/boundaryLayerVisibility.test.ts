import { describe, expect, it } from 'vitest';
import { getBoundaryLayerVisibility } from '@/service/map/features/boundaryLayerVisibility';

describe('boundary layer visibility', () => {
  it('toggles the inverse mask independently from selection boundaries', () => {
    expect(getBoundaryLayerVisibility(false, true, true, null)).toEqual({
      outerMask: false,
      county: true,
      township: true,
    });
  });

  it('hides selection boundaries without hiding the inverse mask', () => {
    expect(getBoundaryLayerVisibility(true, false, true, null)).toEqual({
      outerMask: true,
      county: false,
      township: false,
    });
  });

  it('shows township boundaries only when the current step needs them', () => {
    expect(getBoundaryLayerVisibility(true, true, false, null).township).toBe(
      false,
    );
    expect(getBoundaryLayerVisibility(true, true, true, null).township).toBe(
      true,
    );
    expect(
      getBoundaryLayerVisibility(true, true, false, '鼓山區').township,
    ).toBe(true);
  });
});
