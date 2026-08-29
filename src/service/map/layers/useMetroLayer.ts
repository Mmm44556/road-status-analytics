import { useEffect, useMemo, useRef } from 'react';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorSource from 'ol/source/Vector';
import { fromLonLat } from 'ol/proj';
import { useMetroStations } from '@/service/metroApi';
import { metroStationsToMapPoints } from '@/service/map/features/metroFeatures';

/** 抓取捷運／輕軌站點、轉成地圖點位，並同步進專屬的 VectorSource。 */
export function useMetroLayer(city: string, visible: boolean) {
  const sourceRef = useRef(new VectorSource());
  const { data, isError } = useMetroStations(city, visible);
  const points = useMemo(
    () => metroStationsToMapPoints(data?.data.stations ?? []),
    [data],
  );

  useEffect(() => {
    // TDX 使用經緯度，加入地圖前轉為 Web Mercator 座標。
    const features = visible
      ? points.map((station) => {
          const feature = new Feature({
            geometry: new Point(fromLonLat([station.longitude, station.latitude])),
            metro: station,
          });
          feature.setId(station.id);
          return feature;
        })
      : [];
    sourceRef.current.clear();
    sourceRef.current.addFeatures(features);
  }, [points, visible]);

  return { sourceRef, points, isError: visible && isError };
}
