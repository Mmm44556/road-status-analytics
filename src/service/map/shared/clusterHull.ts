export type MapCoordinate = [number, number];

const cross = (origin: MapCoordinate, a: MapCoordinate, b: MapCoordinate) =>
  (a[0] - origin[0]) * (b[1] - origin[1]) -
  (a[1] - origin[1]) * (b[0] - origin[0]);

/** 使用 Monotone Chain 計算封閉的凸包座標。 */
export function createConvexHull(
  coordinates: MapCoordinate[],
): MapCoordinate[] | null {
  const points = [...new Map(coordinates.map((point) => [point.join(','), point])).values()]
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (points.length < 3) return null;

  const lower: MapCoordinate[] = [];
  for (const point of points) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0
    ) {
      lower.pop();
    }
    lower.push(point);
  }

  const upper: MapCoordinate[] = [];
  for (const point of [...points].reverse()) {
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0
    ) {
      upper.pop();
    }
    upper.push(point);
  }

  const hull = [...lower.slice(0, -1), ...upper.slice(0, -1)];
  if (hull.length < 3) return null;
  return [...hull, hull[0]];
}
