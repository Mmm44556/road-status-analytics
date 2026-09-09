import { describe, expect, it } from 'vitest';
import { getTaiwanOutline } from '@/routes/-welcome/taiwanOutlinePaths';

describe('getTaiwanOutline', () => {
  it('returns one drawable path per county, all within the viewBox', () => {
    const { countyPaths, viewBoxSize } = getTaiwanOutline();

    expect(countyPaths).toHaveLength(22);
    expect(new Set(countyPaths.map((county) => county.id)).size).toBe(22);

    const numberPattern = /-?\d+(?:\.\d+)?/g;
    for (const county of countyPaths) {
      expect(county.d.startsWith('M')).toBe(true);
      expect(county.d.endsWith('Z')).toBe(true);

      const numbers = (county.d.match(numberPattern) ?? []).map(Number);
      expect(numbers.length).toBeGreaterThan(0);
      for (const value of numbers) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(viewBoxSize);
      }
    }
  });

  it('scales to a custom viewBox size', () => {
    const { viewBoxSize } = getTaiwanOutline(200, 8);
    expect(viewBoxSize).toBe(200);
  });

  it('projects arbitrary lon/lat points onto the same coordinate system as the county paths', () => {
    const { projectLonLat, viewBoxSize } = getTaiwanOutline();

    const taipei = projectLonLat([121.5654, 25.033]);
    const kaohsiung = projectLonLat([120.3014, 22.6273]);

    for (const [x, y] of [taipei, kaohsiung]) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(viewBoxSize);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(viewBoxSize);
    }

    // 台北在北、高雄在南；SVG 的 y 軸向下，北邊的 y 值要比南邊小。
    expect(taipei[1]).toBeLessThan(kaohsiung[1]);
  });
});
