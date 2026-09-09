import { describe, expect, it } from 'vitest';
import MultiLineString from 'ol/geom/MultiLineString';
import Point from 'ol/geom/Point';
import { createRouteFeatures } from '@/service/map/features/routeFeatures';

describe('route features', () => {
  it('creates a route and labeled endpoint markers', () => {
    const features = createRouteFeatures({
      type: 'MultiLineString',
      coordinates: [[[120.302, 22.6397], [120.31, 22.63]]],
    });

    expect(features).toHaveLength(3);
    expect(features[0].getGeometry()).toBeInstanceOf(MultiLineString);
    expect(features[1].getGeometry()).toBeInstanceOf(Point);
    expect(features[1].get('routeFeatureKind')).toBe('origin');
    expect(features[2].get('routeFeatureKind')).toBe('destination');
  });
});
