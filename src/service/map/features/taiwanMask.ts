import { merge } from 'topojson-client';
import type {
  GeometryCollection,
  MultiPolygon,
  Polygon,
  Topology,
} from 'topojson-specification';
import taiwanTopologyJson from '@/data/Taiwan-country.topo.json';

type Coordinate = [number, number];

const WORLD_RING: Coordinate[] = [
  [-180, -85],
  [180, -85],
  [180, 85],
  [-180, 85],
  [-180, -85],
];

/** 計算封閉 ring 的方向，正值代表逆時針。 */
function getSignedArea(ring: Coordinate[]) {
  let area = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const current = ring[index];
    const next = ring[index + 1];
    area += current[0] * next[1] - next[0] * current[1];
  }
  return area / 2;
}

/** 遮罩外環逆時針、洞順時針，確保 Canvas 能正確挖空。 */
function orientRing(ring: Coordinate[], clockwise: boolean) {
  const isClockwise = getSignedArea(ring) < 0;
  return isClockwise === clockwise ? ring : [...ring].reverse();
}

/** 建立世界範圍 polygon，並以合併後的臺灣陸地範圍作為透明洞。 */
export function createTaiwanOuterMaskCoordinates() {
  const topology = taiwanTopologyJson as unknown as Topology;
  const counties = topology.objects.map as GeometryCollection;
  const countyGeometries = counties.geometries as Array<Polygon | MultiPolygon>;
  const taiwan = merge(topology, countyGeometries);
  const taiwanRings = taiwan.coordinates.map(
    (polygon) => polygon[0] as Coordinate[],
  );

  return [
    orientRing(WORLD_RING, false),
    ...taiwanRings.map((ring) => orientRing(ring, true)),
  ];
}
