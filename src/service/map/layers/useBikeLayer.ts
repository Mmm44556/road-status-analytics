import { useEffect, useMemo, useRef } from 'react';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorSource from 'ol/source/Vector';
import { fromLonLat } from 'ol/proj';
import { useBikeStationsForCities } from '@/service/bikeApi';
import { bikeStationsToMapPoints } from '@/service/map/features/bikeFeatures';
import { isPointInsideTownship } from '@/service/map/features/administrativeSpatialFilter';
import type { TownshipSelection } from '@/service/map/features/townshipBoundaries';

/** 抓取 YouBike 站點、轉成地圖點位，並同步進專屬的 VectorSource。 */
export function useBikeLayer(
  city: string | null,
  visible: boolean,
  selectedTownship: TownshipSelection | null = null,
  routeCities: string[] = [],
) {
  const sourceRef = useRef(new VectorSource());
  const queryCities = useMemo(
    () => (routeCities.length > 0 ? routeCities : city ? [city] : []),
    [city, routeCities],
  );
  const queryEnabled = queryCities.length > 0 && visible;
  const query = useBikeStationsForCities(queryCities, queryEnabled);
  const points = useMemo(() => {
    const all = bikeStationsToMapPoints(
      query.responses.flatMap((response) => response.data.stations),
    );
    return selectedTownship
      ? all.filter((station) => isPointInsideTownship(station, selectedTownship))
      : all;
  }, [query.responses, selectedTownship]);

  useEffect(() => {
    // TDX 使用經緯度，加入地圖前轉為 Web Mercator 座標。
    const features = visible
      ? points.map((station) => {
          const feature = new Feature({
            geometry: new Point(fromLonLat([station.longitude, station.latitude])),
            bike: station,
          });
          feature.setId(station.id);
          return feature;
        })
      : [];
    sourceRef.current.clear();
    sourceRef.current.addFeatures(features);
  }, [points, visible]);

  return {
    sourceRef,
    points,
    isError: queryEnabled && query.isError,
    isLoading: queryEnabled && query.isFetching,
  };
}
