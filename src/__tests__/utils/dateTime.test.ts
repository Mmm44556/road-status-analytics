import { describe, expect, it } from 'vitest';
import { formatDateTime } from '@/utils/dateTime';

describe('formatDateTime', () => {
  it('formats an ISO timestamp as Taiwan local time', () => {
    expect(formatDateTime('2026-08-29T11:23:48+08:00')).toBe(
      '2026-08-29 11:23:48',
    );
  });

  it('returns the fallback text when the timestamp is missing', () => {
    expect(formatDateTime('')).toBe('未提供');
  });
});
