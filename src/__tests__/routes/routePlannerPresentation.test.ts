import { describe, expect, it } from 'vitest';
import {
  formatRouteDistance,
  formatRouteDuration,
} from '@/routes/-maps/routePlannerPresentation';

describe('route planner presentation', () => {
  it('formats short and long distances', () => {
    expect(formatRouteDistance(850)).toBe('850 公尺');
    expect(formatRouteDistance(4321)).toBe('4.3 公里');
  });

  it('formats duration in minutes and hours', () => {
    expect(formatRouteDuration(678)).toBe('約 12 分鐘');
    expect(formatRouteDuration(5400)).toBe('約 1 小時 30 分鐘');
  });
});
