import { useEffect, useMemo, useRef } from 'react';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorSource from 'ol/source/Vector';
import { fromLonLat } from 'ol/proj';
import { useBusStopsForCities } from '@/service/busApi';
import { busStopsToMapPoints } from '@/service/map/features/busFeatures';
import { isPointInsideTownship } from '@/service/map/features/administrativeSpatialFilter';
import type { TownshipSelection } from '@/service/map/features/townshipBoundaries';

/** 查詢公車站牌並同步到專屬 VectorSource。 */
export function useBusLayer(
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
  const query = useBusStopsForCities(queryCities, queryEnabled);
  const points = useMemo(() => {
    const all = query.responses.flatMap((response) =>
      busStopsToMapPoints(response.data.stops, response.data.city),
    );
    return selectedTownship
      ? all.filter((stop) => isPointInsideTownship(stop, selectedTownship))
      : all;
  }, [query.responses, selectedTownship]);

  useEffect(() => {
    const features = visible
      ? points.map((stop) => {
          const feature = new Feature({
            geometry: new Point(fromLonLat([stop.longitude, stop.latitude])),
            bus: stop,
          });
          feature.setId(stop.id);
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
