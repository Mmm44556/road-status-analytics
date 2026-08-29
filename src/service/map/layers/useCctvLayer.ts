import { useEffect, useMemo, useRef } from 'react';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorSource from 'ol/source/Vector';
import { fromLonLat } from 'ol/proj';
import { getCctvImageUrl, useCctvCameras } from '@/service/cctvApi';
import { cctvsToMapPoints } from '@/service/map/features/cctvFeatures';

/** 抓取 CCTV 點位、轉成地圖點位，並同步進專屬的 VectorSource。 */
export function useCctvLayer(city: string, visible: boolean) {
  const sourceRef = useRef(new VectorSource());
  const { data, isError } = useCctvCameras(city, visible);
  const points = useMemo(
    () =>
      cctvsToMapPoints(
        data?.data.cctvs ?? [],
        (cameraId) => getCctvImageUrl(city, cameraId),
      ),
    [city, data],
  );

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

  return { sourceRef, points, isError: visible && isError };
}
