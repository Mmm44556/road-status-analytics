import { describe, expect, it } from 'vitest';
import IconStyle from 'ol/style/Icon';
import {
  searchLocationStyle,
  userLocationStyle,
} from '@/service/map/shared/locationMarkerStyles';

describe('location marker styles', () => {
  it('uses a pin anchored at its tip for searched places', () => {
    const image = searchLocationStyle.getImage();

    expect(image).toBeInstanceOf(IconStyle);
    expect((image as IconStyle).getAnchor()).toEqual([18, 46]);
  });

  it('uses layered accuracy, ring and center styles for user location', () => {
    expect(userLocationStyle).toHaveLength(3);
    expect(userLocationStyle.every((style) => style.getImage())).toBe(true);
  });
});
