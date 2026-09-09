import { describe, expect, it } from 'vitest';
import { getCountySelectionPresentation } from '@/routes/-maps/countySelectionPresentation';

describe('county selection control presentation', () => {
  it('guides the user to select a county first', () => {
    expect(getCountySelectionPresentation(null, null, false)).toEqual({
      mode: 'selecting',
      step: '步驟 1 / 2',
      message: '請點選地圖上的縣市',
    });
  });

  it('guides the user to select or skip a township second', () => {
    expect(getCountySelectionPresentation('高雄市', null, true)).toEqual({
      mode: 'selecting',
      step: '步驟 2 / 2',
      message: '高雄市 · 請選擇鄉鎮',
    });
  });

  it('collapses a completed selection into an area label', () => {
    expect(getCountySelectionPresentation('高雄市', '鼓山區', false)).toEqual({
      mode: 'complete',
      label: '高雄市 · 鼓山區',
    });
    expect(getCountySelectionPresentation('高雄市', null, false)).toEqual({
      mode: 'complete',
      label: '高雄市 · 全區',
    });
  });
});
