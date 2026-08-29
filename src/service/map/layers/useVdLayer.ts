import { useEffect, useMemo, useRef } from 'react';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorSource from 'ol/source/Vector';
import { fromLonLat } from 'ol/proj';
import { useVds } from '@/service/vdApi';
import { vdsToMapPoints } from '@/service/map/features/vdFeatures';

/** 抓取 VD（車輛偵測器）點位、轉成地圖點位，並同步進專屬的 VectorSource。 */
export function useVdLayer(city: string, visible: boolean) {
  const sourceRef = useRef(new VectorSource());
  const { data, isError } = useVds(city, visible);
  const points = useMemo(
    () => vdsToMapPoints(data?.data.vds ?? []),
    [data],
  );

  useEffect(() => {
    // TDX 使用經緯度，加入地圖前轉為 Web Mercator 座標。
    const features = visible
      ? points.map((vd) => {
          const feature = new Feature({
            geometry: new Point(fromLonLat([vd.longitude, vd.latitude])),
            vd,
          });
          feature.setId(vd.id);
          return feature;
        })
      : [];
    sourceRef.current.clear();
    sourceRef.current.addFeatures(features);
  }, [points, visible]);

  return { sourceRef, points, isError: visible && isError };
}
