import { describe, expect, it } from 'vitest';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import {
  getClusterHoverFeature,
  getClusterMembers,
  getClusterTitle,
  getMapFeatureCursor,
} from '@/service/map/shared/mapInteractions';

describe('getMapFeatureCursor', () => {
  it('uses a pointer cursor over an interactive feature', () => {
    expect(getMapFeatureCursor(true)).toBe('pointer');
  });

  it('restores the default cursor outside features', () => {
    expect(getMapFeatureCursor(false)).toBe('');
  });

  it('reads members from a cluster feature', () => {
    const members = [new Feature(new Point([1, 2]))];
    const cluster = new Feature({ features: members });

    expect(getClusterMembers(cluster)).toBe(members);
  });

  it('only returns a hover feature for a multi-member cluster', () => {
    const single = new Feature({
      features: [new Feature(new Point([1, 2]))],
    });
    const multiple = new Feature({
      features: [
        new Feature(new Point([1, 2])),
        new Feature(new Point([3, 4])),
      ],
    });

    expect(getClusterHoverFeature(single)).toBeUndefined();
    expect(getClusterHoverFeature(multiple)).toBe(multiple);
    expect(getClusterHoverFeature(undefined)).toBeUndefined();
  });

  it('uses the point name as the title for a single member', () => {
    const member = new Feature({ name: '中央公園站' });

    expect(getClusterTitle([member], '捷運', (item) => item.get('name'))).toBe(
      '中央公園站',
    );
  });

  it('summarizes names when hovering a multi-member cluster', () => {
    const members = ['民生站', '中山站', '美麗島站', '高雄車站'].map(
      (name) => new Feature({ name }),
    );

    expect(getClusterTitle(members, '公車站牌', (item) => item.get('name')))
      .toBe('公車站牌（4 筆）\n民生站\n中山站\n美麗島站\n另有 1 筆');
  });
});
