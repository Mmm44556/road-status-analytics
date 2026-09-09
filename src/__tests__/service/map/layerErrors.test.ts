import { describe, expect, it } from 'vitest';
import {
  getLayerStatuses,
  getRemainingLoadingVisibility,
} from '@/service/map/layerErrors';

describe('getLayerStatuses', () => {
  it('returns one independent status for each layer', () => {
    expect(getLayerStatuses(
      {
        roadEvents: true,
      },
      {
        cctv: true,
      },
    )).toMatchObject([
      {
        id: 'cctv',
        type: 'loading',
        message: '路口影像讀取中…',
      },
      {
        id: 'roadEvents',
        type: 'error',
        message: '交通事件讀取失敗，請稍後再試。',
      },
    ]);
  });

  it('prioritizes an error over loading for the same layer', () => {
    expect(
      getLayerStatuses({ bikeShare: true }, { bikeShare: true }),
    ).toMatchObject([
      { id: 'bikeShare', type: 'error', message: 'YouBike讀取失敗，請稍後再試。' },
    ]);
  });

  it('returns an empty list when every layer is idle', () => {
    expect(getLayerStatuses({}, {})).toEqual([]);
  });
});

describe('getRemainingLoadingVisibility', () => {
  it('keeps a visible loading notice on screen for at least 600ms', () => {
    expect(getRemainingLoadingVisibility(1_000, 1_200)).toBe(400);
    expect(getRemainingLoadingVisibility(1_000, 1_700)).toBe(0);
  });
});
