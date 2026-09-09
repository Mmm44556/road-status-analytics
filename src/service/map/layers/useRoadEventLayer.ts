import { useEffect, useMemo, useRef } from 'react';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorSource from 'ol/source/Vector';
import { fromLonLat } from 'ol/proj';
import { roadEventsToMapPoints } from '@/service/map/features/mapFeatures';
import { isPointInsideTownship } from '@/service/map/features/administrativeSpatialFilter';
import type { TownshipSelection } from '@/service/map/features/townshipBoundaries';
import { filterPointsNearRoute } from '@/service/map/features/routeEventAnalysis';
import type { RouteResult } from '@/service/routeApi';
import { useRoadEventsForCities } from '@/service/trafficApi';

/** 抓取道路事件、轉成地圖點位，並同步進專屬的 VectorSource。 */
export function useRoadEventLayer(
  city: string | null,
  visible: boolean,
  selectedTownship: TownshipSelection | null = null,
  analysisEnabled = false,
  routeCities: string[] = [],
  routeGeometry: RouteResult['geometry'] | null = null,
) {
  const sourceRef = useRef(new VectorSource());
  const queryCities = useMemo(
    () => (routeCities.length > 0 ? routeCities : city ? [city] : []),
    [city, routeCities],
  );
  const queryEnabled = queryCities.length > 0 && (visible || analysisEnabled);
  const query = useRoadEventsForCities(queryCities, queryEnabled);
  const allPoints = useMemo(
    () => {
      const seen = new Set<string>();
      return query.responses.flatMap((response) =>
        roadEventsToMapPoints(
          response.data.preview.Events,
          response.data.live.LiveEvents,
        ).filter((event) => {
          if (seen.has(event.eventId)) return false;
          seen.add(event.eventId);
          return true;
        }),
      );
    },
    [query.responses],
  );
  const points = useMemo(
    () => {
      if (routeGeometry) return filterPointsNearRoute(routeGeometry, allPoints);
      return selectedTownship
        ? allPoints.filter((event) =>
            isPointInsideTownship(event, selectedTownship),
          )
        : allPoints;
    },
    [allPoints, routeGeometry, selectedTownship],
  );

  useEffect(() => {
    // TDX 使用經緯度，加入地圖前轉為 Web Mercator 座標。
    const features = visible
      ? points.map((event) => {
          const feature = new Feature({
            geometry: new Point(fromLonLat([event.longitude, event.latitude])),
            event,
          });
          feature.setId(event.eventId);
          return feature;
        })
      : [];
    sourceRef.current.clear();
    sourceRef.current.addFeatures(features);
  }, [points, visible]);

  return {
    sourceRef,
    allPoints,
    points,
    isError: queryEnabled && query.isError,
    isLoading: queryEnabled && query.isFetching,
  };
}
