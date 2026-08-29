import { useEffect, useMemo, useRef } from 'react';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import VectorSource from 'ol/source/Vector';
import { fromLonLat } from 'ol/proj';
import { useLiveTraffic } from '@/service/liveTrafficApi';

/** 將官方即時路況轉為 OpenLayers 線圖徵並同步至專屬資料源。 */
export function useLiveTrafficLayer(city: string, visible: boolean) {
  const sourceRef = useRef(new VectorSource());
  const query = useLiveTraffic(city, visible);
  const segments = useMemo(() => query.data?.data.segments ?? [], [query.data]);

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

  return { sourceRef, segments, isError: query.isError };
}
