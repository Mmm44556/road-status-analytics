export type CongestionPresentation = {
  label: string;
  color: string;
};

const congestionLevels: Record<number, CongestionPresentation> = {
  1: { label: '順暢', color: '#16A36A' },
  2: { label: '車多', color: '#E6B422' },
  3: { label: '壅塞', color: '#E77A22' },
  4: { label: '嚴重壅塞', color: '#D64242' },
  5: { label: '極度壅塞', color: '#8F2638' },
};

/** 將 TDX 壅塞級別轉為一致的地圖顏色與中文標籤。 */
export function getCongestionPresentation(level: number): CongestionPresentation {
  return congestionLevels[level] ?? { label: '資料異常', color: '#7B8790' };
}

export const congestionLegend = Object.entries(congestionLevels).map(
  ([level, presentation]) => ({ level: Number(level), ...presentation }),
);
