import { useEffect, useMemo, useRef } from 'react';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorSource from 'ol/source/Vector';
import { fromLonLat } from 'ol/proj';
import { getCctvImageUrl, useCctvCamerasForCities } from '@/service/cctvApi';
import { cctvsToMapPoints } from '@/service/map/features/cctvFeatures';
import { isPointInsideTownship } from '@/service/map/features/administrativeSpatialFilter';
import type { TownshipSelection } from '@/service/map/features/townshipBoundaries';
import { filterPointsNearRoute } from '@/service/map/features/routeEventAnalysis';
import type { RouteResult } from '@/service/routeApi';

/** 抓取 CCTV 點位、轉成地圖點位，並同步進專屬的 VectorSource。 */
export function useCctvLayer(
  city: string | null,
  visible: boolean,
  selectedTownship: TownshipSelection | null = null,
  routeCities: string[] = [],
  routeGeometry: RouteResult['geometry'] | null = null,
) {
  const sourceRef = useRef(new VectorSource());
  const queryCities = useMemo(
    () => (routeCities.length > 0 ? routeCities : city ? [city] : []),
    [city, routeCities],
  );
  const queryEnabled = queryCities.length > 0 && visible;
  const query = useCctvCamerasForCities(queryCities, queryEnabled);
  const points = useMemo(() => {
    const seen = new Set<string>();
    const all = query.responses.flatMap((response) =>
      cctvsToMapPoints(
        response.data.cctvs,
        (cameraId) => getCctvImageUrl(response.data.city, cameraId),
      ).filter((cctv) => {
        if (seen.has(cctv.id)) return false;
        seen.add(cctv.id);
        return true;
      }),
    );
    if (routeGeometry) return filterPointsNearRoute(routeGeometry, all);
    return selectedTownship
      ? all.filter((cctv) => isPointInsideTownship(cctv, selectedTownship))
      : all;
  }, [query.responses, routeGeometry, selectedTownship]);

  useEffect(() => {
    // TDX 使用經緯度，加入地圖前轉為 Web Mercator 座標。
    const features = visible
      ? points.map((cctv) => {
          const feature = new Feature({
            geometry: new Point(fromLonLat([cctv.longitude, cctv.latitude])),
            cctv,
          });
          feature.setId(cctv.id);
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
