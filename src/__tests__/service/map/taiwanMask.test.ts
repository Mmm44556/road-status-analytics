import { describe, expect, it } from 'vitest';
import Polygon from 'ol/geom/Polygon';
import { createTaiwanOuterMaskCoordinates } from '@/service/map/features/taiwanMask';

describe('createTaiwanOuterMaskCoordinates', () => {
  it('creates a world polygon with Taiwan county boundaries as holes', () => {
    const coordinates = createTaiwanOuterMaskCoordinates();
    const mask = new Polygon(coordinates);

    expect(coordinates.length).toBeGreaterThan(2);
    expect(mask.intersectsCoordinate([130, 30])).toBe(true);
    expect(mask.intersectsCoordinate([121, 23.5])).toBe(false);
    expect(mask.intersectsCoordinate([118.35, 24.45])).toBe(false);
  });
});
