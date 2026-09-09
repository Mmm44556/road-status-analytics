import { useEffect, useMemo, useRef } from 'react';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import VectorSource from 'ol/source/Vector';
import { fromLonLat } from 'ol/proj';
import { useLiveTraffic } from '@/service/liveTrafficApi';
import { doesLineIntersectTownship } from '@/service/map/features/administrativeSpatialFilter';
import type { TownshipSelection } from '@/service/map/features/townshipBoundaries';

/** 將官方即時路況轉為 OpenLayers 線圖徵並同步至專屬資料源。 */
export function useLiveTrafficLayer(
  city: string | null,
  visible: boolean,
  selectedTownship: TownshipSelection | null = null,
) {
  const sourceRef = useRef(new VectorSource());
  const queryEnabled = Boolean(city) && visible;
  const query = useLiveTraffic(city ?? '', queryEnabled);
  const segments = useMemo(() => {
    const all = query.data?.data.segments ?? [];
    return selectedTownship
      ? all.filter((segment) =>
          doesLineIntersectTownship(segment.coordinates, selectedTownship),
        )
      : all;
  }, [query.data, selectedTownship]);

  useEffect(() => {
    const features = visible
      ? segments.map((segment) => {
          const feature = new Feature({
            geometry: new LineString(
              segment.coordinates.map((coordinate) => fromLonLat(coordinate)),
            ),
            liveTraffic: segment,
          });
          feature.setId(segment.sectionId);
          return feature;
        })
      : [];
    sourceRef.current.clear();
    sourceRef.current.addFeatures(features);
  }, [segments, visible]);

  return {
    sourceRef,
    segments,
    isError: queryEnabled && query.isError,
    isLoading: queryEnabled && query.isFetching,
  };
}
