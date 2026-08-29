import { useEffect, useMemo, useRef } from 'react';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorSource from 'ol/source/Vector';
import { fromLonLat } from 'ol/proj';
import { useParkingSegments } from '@/service/parkingSegmentApi';
import { parkingSegmentsToMapPoints } from '@/service/map/features/parkingSegmentFeatures';

/** 抓取路邊停車格路段、轉成地圖點位，並同步進專屬的 VectorSource。 */
export function useParkingSegmentLayer(city: string, visible: boolean) {
  const sourceRef = useRef(new VectorSource());
  const { data, isError } = useParkingSegments(city, visible);
  const points = useMemo(
    () => parkingSegmentsToMapPoints(data?.data.segments ?? []),
    [data],
  );

  useEffect(() => {
    // TDX 使用經緯度，加入地圖前轉為 Web Mercator 座標。
    const features = visible
      ? points.map((segment) => {
          const feature = new Feature({
            geometry: new Point(fromLonLat([segment.longitude, segment.latitude])),
            parkingSegment: segment,
          });
          feature.setId(segment.id);
          return feature;
        })
      : [];
    sourceRef.current.clear();
    sourceRef.current.addFeatures(features);
  }, [points, visible]);

  return { sourceRef, points, isError: visible && isError };
}
