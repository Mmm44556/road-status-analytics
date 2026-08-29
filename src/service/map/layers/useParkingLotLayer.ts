import { useEffect, useMemo, useRef } from 'react';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorSource from 'ol/source/Vector';
import { fromLonLat } from 'ol/proj';
import { useParkingLots } from '@/service/parkingLotApi';
import { parkingLotsToMapPoints } from '@/service/map/features/parkingLotFeatures';

/** 抓取戶外停車場、轉成地圖點位，並同步進專屬的 VectorSource。 */
export function useParkingLotLayer(city: string, visible: boolean) {
  const sourceRef = useRef(new VectorSource());
  const { data, isError } = useParkingLots(city, visible);
  const points = useMemo(
    () => parkingLotsToMapPoints(data?.data.lots ?? []),
    [data],
  );

  useEffect(() => {
    // TDX 使用經緯度，加入地圖前轉為 Web Mercator 座標。
    const features = visible
      ? points.map((lot) => {
          const feature = new Feature({
            geometry: new Point(fromLonLat([lot.longitude, lot.latitude])),
            parkingLot: lot,
          });
          feature.setId(lot.id);
          return feature;
        })
      : [];
    sourceRef.current.clear();
    sourceRef.current.addFeatures(features);
  }, [points, visible]);

  return { sourceRef, points, isError: visible && isError };
}
