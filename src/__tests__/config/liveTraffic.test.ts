import { describe, expect, it } from 'vitest';
import { getCongestionPresentation } from '@/config/liveTraffic';

describe('live traffic presentation', () => {
  it('maps TDX congestion levels to semantic labels', () => {
    expect(getCongestionPresentation(1).label).toBe('順暢');
    expect(getCongestionPresentation(4).label).toBe('嚴重壅塞');
  });

  it('uses a neutral fallback for abnormal levels', () => {
    expect(getCongestionPresentation(-99)).toEqual({
      label: '資料異常',
      color: '#7B8790',
    });
  });
});
