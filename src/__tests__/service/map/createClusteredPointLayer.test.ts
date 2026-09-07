import { describe, expect, it } from 'vitest';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorSource from 'ol/source/Vector';
import Style from 'ol/style/Style';
import { createClusteredPointLayer } from '@/service/map/shared/createClusteredPointLayer';

function createLayer() {
  return createClusteredPointLayer({
    source: new VectorSource(),
    hullFillColor: 'rgba(0,0,0,.1)',
    hullStrokeColor: '#000000',
    singleStyle: () => new Style(),
  });
}

describe('createClusteredPointLayer expansion', () => {
  it('creates clickable display features for overlapping members', () => {
    const layer = createLayer();
    const members = [
      new Feature(new Point([10, 20])),
      new Feature(new Point([10, 20])),
    ];

    layer.expand(members, [10, 20], 1);

    const displayFeatures = layer.expansionDataLayer
      .getSource()!
      .getFeatures();
    expect(displayFeatures).toHaveLength(2);
    expect(layer.getExpandedMember(displayFeatures[0])).toBe(members[0]);

    layer.clearExpansion();
    expect(layer.expansionDataLayer.getSource()!.isEmpty()).toBe(true);
    layer.dispose();
  });
});
