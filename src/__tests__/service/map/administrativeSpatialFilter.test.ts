import { describe, expect, it } from 'vitest';
import {
  doesLineIntersectTownship,
  isPointInsideTownship,
} from '@/service/map/features/administrativeSpatialFilter';
import type { TownshipSelection } from '@/service/map/features/townshipBoundaries';

const squareTownship: TownshipSelection = {
  id: 'square',
  name: '測試方形鄉鎮',
  countyId: 'test-county',
  geometry: {
    type: 'Polygon',
    coordinates: [[[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]]],
  },
};

const multiSquareTownship: TownshipSelection = {
  id: 'multi-square',
  name: '測試多邊形鄉鎮',
  countyId: 'test-county',
  geometry: {
    type: 'MultiPolygon',
    coordinates: [
      [[[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]]],
      [[[100, 100], [100, 110], [110, 110], [110, 100], [100, 100]]],
    ],
  },
};

describe('isPointInsideTownship', () => {
  it('回傳 true：Polygon 內的點', () => {
    expect(isPointInsideTownship({ longitude: 5, latitude: 5 }, squareTownship)).toBe(true);
  });

  it('回傳 false：Polygon 外的點', () => {
    expect(isPointInsideTownship({ longitude: 20, latitude: 20 }, squareTownship)).toBe(false);
  });

  it('回傳 true：MultiPolygon 其中一塊內的點', () => {
    expect(
      isPointInsideTownship({ longitude: 105, latitude: 105 }, multiSquareTownship),
    ).toBe(true);
  });

  it('回傳 false：MultiPolygon 兩塊之外的點', () => {
    expect(
      isPointInsideTownship({ longitude: 50, latitude: 50 }, multiSquareTownship),
    ).toBe(false);
  });
});

describe('doesLineIntersectTownship', () => {
  it('回傳 true：線段實際穿越鄉鎮邊界', () => {
    const crossing: [number, number][] = [[-5, 5], [15, 5]];
    expect(doesLineIntersectTownship(crossing, squareTownship)).toBe(true);
  });

  it('回傳 false：僅 bounding box 重疊，實際 geometry 不相交', () => {
    // 折線繞過方形鄉鎮的左下角外側：第一段 x 恆為負、第二段 y 恆為負，
    // 從未真正進入鄉鎮範圍，但整體 bounding box 完全涵蓋鄉鎮的 bbox，
    // 用來驗證篩選邏輯是真的做 geometry 相交判斷，不是只比較 bbox。
    const bboxOverlapOnly: [number, number][] = [
      [-5, 12],
      [-1, -1],
      [12, -5],
    ];
    expect(doesLineIntersectTownship(bboxOverlapOnly, squareTownship)).toBe(false);
  });

  it('回傳 false：座標點數不足以構成線段', () => {
    expect(doesLineIntersectTownship([[5, 5]], squareTownship)).toBe(false);
  });
});
