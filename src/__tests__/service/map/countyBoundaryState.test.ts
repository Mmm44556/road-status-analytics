import { describe, expect, it } from 'vitest';
import {
  getCountyBoundaryPalette,
  getCountyBoundaryState,
  isBoundaryLabelVisible,
} from '@/service/map/features/countyBoundaryState';

describe('getCountyBoundaryState', () => {
  it('uses default and hover states while choosing a county', () => {
    expect(getCountyBoundaryState('64000', null, null)).toBe('default');
    expect(getCountyBoundaryState('64000', null, '64000')).toBe('hovered');
  });

  it('masks every county except the selected county', () => {
    expect(getCountyBoundaryState('64000', '64000', null)).toBe('selected');
    expect(getCountyBoundaryState('63000', '64000', null)).toBe('masked');
  });

  it('keeps the selected boundary label visible while hiding masked labels', () => {
    expect(isBoundaryLabelVisible('selected')).toBe(true);
    expect(isBoundaryLabelVisible('masked')).toBe(false);
  });

  it('assigns stable variations so counties can be distinguished', () => {
    const countyIds = ['64000', '63000', '65000', '66000', '67000', '68000'];
    const colors = countyIds.map((id) => getCountyBoundaryPalette(id).fill);

    expect(new Set(colors).size).toBeGreaterThan(3);
    expect(getCountyBoundaryPalette('64000')).toEqual(
      getCountyBoundaryPalette('64000'),
    );
  });
});
