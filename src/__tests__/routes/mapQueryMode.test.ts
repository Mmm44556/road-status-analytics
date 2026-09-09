import { describe, expect, it } from 'vitest';
import {
  canToggleLayerInQueryMode,
  getRouteModeVisibleLayers,
} from '@/routes/-maps/mapQueryMode';

describe('map query mode', () => {
  it('automatically enables route-supported point layers', () => {
    expect([...getRouteModeVisibleLayers()]).toEqual([
      'roadEvents',
      'cctv',
      'vehicleDetectors',
    ]);
    expect([...getRouteModeVisibleLayers('transit')]).toEqual([
      'roadEvents',
      'cctv',
      'vehicleDetectors',
      'bikeShare',
      'metro',
      'bus',
    ]);
  });

  it('allows only route-supported layers in route mode', () => {
    expect(canToggleLayerInQueryMode('route', 'cctv', true, true)).toBe(true);
    expect(canToggleLayerInQueryMode('route', 'bikeShare', true, true)).toBe(true);
    expect(canToggleLayerInQueryMode('area', 'bikeShare', true, false)).toBe(
      true,
    );
  });
});
