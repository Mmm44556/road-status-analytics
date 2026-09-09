import { describe, expect, it } from 'vitest';
import { getRefreshableSelection } from '@/service/map/selectedFeatureRefresh';
import type { SelectedFeature } from '@/service/map/useTrafficMap';

describe('getRefreshableSelection', () => {
  it('returns the kind and id for refreshable point layers', () => {
    const selection = {
      kind: 'bike',
      data: { id: 'bike-1' },
    } as SelectedFeature;

    expect(getRefreshableSelection(selection)).toEqual({
      kind: 'bike',
      id: 'bike-1',
    });
  });

  it('does not refresh static popup types when opened', () => {
    const selection = {
      kind: 'event',
      data: { id: 'event-1' },
    } as unknown as SelectedFeature;

    expect(getRefreshableSelection(selection)).toBeNull();
    expect(getRefreshableSelection(null)).toBeNull();
  });
});
