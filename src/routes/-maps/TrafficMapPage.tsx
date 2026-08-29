import { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Snackbar from '@mui/material/Snackbar';
import TrafficMapPreview from '@/service/TrafficMapPreview';
import { TrafficMapViewContext } from '@/context';
import { createMapController } from '@/service/map/shared/mapController';
import type { TrafficLayerId } from '@/data/trafficLayerCatalog';
import { trafficLayerCatalog } from '@/data/trafficLayerCatalog';
import LayerPanel from './LayerPanel';
import MapToolbar from './MapToolbar';
import TrafficLegend from './TrafficLegend';

/** 組合 GIS 地圖、圖層控制與搜尋工具。 */
export default function TrafficMapPage() {
  const mapController = useMemo(() => createMapController(), []);
  const [visibleLayers, setVisibleLayers] = useState<Set<TrafficLayerId>>(
    () =>
      new Set(
        trafficLayerCatalog
          .filter((layer) => layer.defaultVisible)
          .map((layer) => layer.id),
      ),
  );
  const [notice, setNotice] = useState<string | null>(null);

  const toggleLayer = (layerId: TrafficLayerId) => {
    const layer = trafficLayerCatalog.find((item) => item.id === layerId);
    if (!layer || layer.availability !== 'available') return;
    setVisibleLayers((current) => {
      const next = new Set(current);
      if (next.has(layerId)) next.delete(layerId);
      else next.add(layerId);
      return next;
    });
  };

  const locateUser = () => {
    if (!navigator.geolocation) {
      setNotice('你的瀏覽器不支援定位功能。');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        mapController.flyTo([coords.longitude, coords.latitude], 16),
      () => setNotice('無法取得目前位置，請檢查瀏覽器定位權限。'),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const searchPlace = (query: string) => {
    setNotice(
      query
        ? `「${query}」搜尋會在地點資料介接階段啟用。`
        : '請輸入地址、道路或地標。',
    );
  };

  return (
    <TrafficMapViewContext.Provider value={{ mapController }}>
      <Box
        sx={{
          height: 'calc(100dvh - 64px)',
          minHeight: 480,
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          bgcolor: '#DDE8E6',
        }}
      >
        <Box
          component="section"
          aria-label="即時交通地圖工作區"
          sx={{ position: 'relative', minWidth: 0, flex: 1 }}
        >
          <TrafficMapPreview
            height="100%"
            city="高雄市"
            showLocateControl={false}
            showEventCount={false}
            showRoadEvents={visibleLayers.has('roadEvents')}
            showCctv={visibleLayers.has('cctv')}
            showLiveTraffic={visibleLayers.has('liveTraffic')}
            showVehicleDetectors={visibleLayers.has('vehicleDetectors')}
            showBikeShare={visibleLayers.has('bikeShare')}
            showMetro={visibleLayers.has('metro')}
            showParkingLots={visibleLayers.has('parkingLots')}
            showParkingSegments={visibleLayers.has('parkingSegments')}
          />
          <LayerPanel visibleLayers={visibleLayers} onToggle={toggleLayer} />
          {visibleLayers.has('liveTraffic') && <TrafficLegend />}
          <MapToolbar
            statusMessage="道路事件服務運作中"
            onLocate={locateUser}
            onSearch={searchPlace}
          />
        </Box>
        <Snackbar
          open={Boolean(notice)}
          transitionDuration={{
            enter: 300,
            exit: 0,
          }}
          onClose={() => setNotice(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            severity="info"
            variant="filled"
            onClose={() => setNotice(null)}
            style={{
              alignItems: 'center',
            }}
          >
            {notice}
          </Alert>
        </Snackbar>
      </Box>
    </TrafficMapViewContext.Provider>
  );
}
