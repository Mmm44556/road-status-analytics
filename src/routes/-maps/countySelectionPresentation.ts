export type SelectionPresentation =
  | { mode: 'selecting'; step: string; message: string }
  | { mode: 'complete'; label: string };

/** 將行政區選取狀態轉成畫面使用的步驟與文字。 */
export function getCountySelectionPresentation(
  countyName: string | null,
  townshipName: string | null,
  isSelectingTownship: boolean,
): SelectionPresentation {
  if (!countyName) {
    return {
      mode: 'selecting',
      step: '步驟 1 / 2',
      message: '請點選地圖上的縣市',
    };
  }
  if (isSelectingTownship) {
    return {
      mode: 'selecting',
      step: '步驟 2 / 2',
      message: `${countyName} · 請選擇鄉鎮`,
    };
  }
  return {
    mode: 'complete',
    label: `${countyName} · ${townshipName ?? '全區'}`,
  };
}
