import { useEffect, useMemo, useRef } from 'react';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorSource from 'ol/source/Vector';
import { fromLonLat } from 'ol/proj';
import { roadEventsToMapPoints } from '@/service/map/features/mapFeatures';
import { useRoadEvents } from '@/service/trafficApi';

/** 抓取道路事件、轉成地圖點位，並同步進專屬的 VectorSource。 */
export function useRoadEventLayer(city: string, visible: boolean) {
  const sourceRef = useRef(new VectorSource());
  const { data, isError } = useRoadEvents(city);
  const points = useMemo(
    () =>
      roadEventsToMapPoints(
        data?.data.preview.Events ?? [],
        data?.data.live.LiveEvents ?? [],
      ),
    [data],
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

  return { sourceRef, points, isError };
}
