import { feature } from 'topojson-client';
import type { MultiPolygon, Polygon } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';

export type TownshipBoundary = {
  id: string;
  name: string;
  countyId: string;
  geometry: Polygon | MultiPolygon;
};

export type TownshipSelection = Pick<
  TownshipBoundary,
  'id' | 'name' | 'countyId' | 'geometry'
>;

const TOWNSHIP_LOADERS: Record<string, () => Promise<{ default: unknown }>> = {
  '09007': () => import('@/data/township/Lienchiang-09007.topo.json'),
  '09020': () => import('@/data/township/Kinmen-09020.topo.json'),
  '10002': () => import('@/data/township/Yilan-10002.topo.json'),
  '10004': () => import('@/data/township/Hsinchu-10004.topo.json'),
  '10005': () => import('@/data/township/Miaoli-10005.topo.json'),
  '10007': () => import('@/data/township/Changhua-10007.topo.json'),
  '10008': () => import('@/data/township/Nantou-10008.topo.json'),
  '10009': () => import('@/data/township/Yunlin-10009.topo.json'),
  '10010': () => import('@/data/township/Chiayi-10010.topo.json'),
  '10013': () => import('@/data/township/Pingtung-10013.topo.json'),
  '10014': () => import('@/data/township/Taitung-10014.topo.json'),
  '10015': () => import('@/data/township/Hualien-10015.topo.json'),
  '10016': () => import('@/data/township/Penghu-10016.topo.json'),
  '10017': () => import('@/data/township/Keelung-10017.topo.json'),
  '10018': () => import('@/data/township/HsinchuCity-10018.topo.json'),
  '10020': () => import('@/data/township/ChiayiCity-10020.topo.json'),
  '63000': () => import('@/data/township/Taipei-63000.topo.json'),
  '64000': () => import('@/data/township/Kaohsiung-64000.topo.json'),
  '65000': () => import('@/data/township/NewTaipei-65000.topo.json'),
  '66000': () => import('@/data/township/Taichung-66000.topo.json'),
  '67000': () => import('@/data/township/Tainan-67000.topo.json'),
  '68000': () => import('@/data/township/Taoyuan-68000.topo.json'),
};

/** 取得指定縣市的鄉鎮 GeoJSON 邊界。 */
export async function getTownshipBoundaries(
  countyId: string,
): Promise<TownshipBoundary[]> {
  const loader = TOWNSHIP_LOADERS[countyId];
  if (!loader) return [];
  const topology = (await loader()).default as Topology;
  const townships = topology.objects.map as GeometryCollection<{
    id: string;
    name: string;
  }>;
  const collection = feature(topology, townships);

  return collection.features.map((township) => ({
    id: township.properties.id,
    name: township.properties.name,
    countyId,
    geometry: township.geometry as Polygon | MultiPolygon,
  }));
}
