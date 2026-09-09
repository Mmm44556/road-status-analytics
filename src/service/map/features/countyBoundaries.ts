import { feature } from 'topojson-client';
import type { MultiPolygon, Polygon } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';
import taiwanTopologyJson from '@/data/Taiwan-country.topo.json';

export type CountyBoundary = {
  id: string;
  name: string;
  geometry: Polygon | MultiPolygon;
};

export type CountySelection = Pick<CountyBoundary, 'id' | 'name'>;

/** 將縣市 TopoJSON 轉為地圖可使用的 GeoJSON 邊界資料。 */
export function getCountyBoundaries(): CountyBoundary[] {
  const topology = taiwanTopologyJson as unknown as Topology;
  const counties = topology.objects.map as GeometryCollection<{
    id: string;
    name: string;
  }>;
  const collection = feature(topology, counties);

  return collection.features.map((county) => ({
    id: county.properties.id,
    name: county.properties.name,
    geometry: county.geometry as Polygon | MultiPolygon,
  }));
}
