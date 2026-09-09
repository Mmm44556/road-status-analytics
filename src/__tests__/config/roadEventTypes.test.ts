import { describe, expect, it } from 'vitest';
import {
  getRoadEventLabel,
  getRoadEventType,
  roadEventSubTypes,
  roadEventTypes,
} from '@/config/roadEventTypes';

describe('TDX road event code table', () => {
  it('maps the eight official event categories', () => {
    expect(Object.keys(roadEventTypes)).toHaveLength(8);
    expect(getRoadEventType(1).label).toBe('交通事故');
    expect(getRoadEventType(8).label).toBe('其它異常告警');
  });

  it('maps official event subtypes', () => {
    expect(roadEventSubTypes[207]).toBe('道路或鋪面施工');
    expect(roadEventSubTypes[303]).toBe('嚴重壅塞');
    expect(roadEventSubTypes[805]).toBe('號誌故障');
  });

  it('formats known and unknown event codes safely', () => {
    expect(getRoadEventLabel(2, 207)).toBe('施工・道路或鋪面施工');
    expect(getRoadEventLabel(99, 999)).toBe('未分類事件');
  });
});
