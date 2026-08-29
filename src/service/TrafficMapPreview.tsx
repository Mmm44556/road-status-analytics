import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import MyLocationRoundedIcon from '@mui/icons-material/MyLocationRounded';
import 'ol/ol.css';
import { shadowTokens, typographyTokens } from '@/config/designTokens';
import { useTrafficMapContext } from '@/hooks/useGetContext';
import { useCctvLayer } from '@/service/map/layers/useCctvLayer';
import { useRoadEventLayer } from '@/service/map/layers/useRoadEventLayer';
import { useLiveTrafficLayer } from '@/service/map/layers/useLiveTrafficLayer';
import { useVdLayer } from '@/service/map/layers/useVdLayer';
import { useBikeLayer } from '@/service/map/layers/useBikeLayer';
import { useReloadBikeStation } from '@/service/bikeApi';
import { useReloadVd } from '@/service/vdApi';
import { useMetroLayer } from '@/service/map/layers/useMetroLayer';
import { useReloadMetroStation } from '@/service/metroApi';
import { useParkingLotLayer } from '@/service/map/layers/useParkingLotLayer';
import { useReloadParkingLot } from '@/service/parkingLotApi';
import { useParkingSegmentLayer } from '@/service/map/layers/useParkingSegmentLayer';
import { useReloadParkingSegment } from '@/service/parkingSegmentApi';
import { useTrafficMap } from '@/service/map/useTrafficMap';
import CctvPopupCard from '@/service/map/popups/CctvPopupCard';
import RoadEventPopupCard from '@/service/map/popups/RoadEventPopupCard';
import LiveTrafficPopupCard from '@/service/map/popups/LiveTrafficPopupCard';
import VdPopupCard from '@/service/map/popups/VdPopupCard';
import BikePopupCard from '@/service/map/popups/BikePopupCard';
import MetroPopupCard from '@/service/map/popups/MetroPopupCard';
import ParkingLotPopupCard from '@/service/map/popups/ParkingLotPopupCard';
import ParkingSegmentPopupCard from '@/service/map/popups/ParkingSegmentPopupCard';

type TrafficMapPreviewProps = {
  height?: number | string | Record<string, number | string>;
  city?: string;
  showLocateControl?: boolean;
  showEventCount?: boolean;
  showRoadEvents?: boolean;
  showCctv?: boolean;
  showLiveTraffic?: boolean;
  showVehicleDetectors?: boolean;
  showBikeShare?: boolean;
  showMetro?: boolean;
  showParkingLots?: boolean;
  showParkingSegments?: boolean;
};

/** 顯示具事件 cluster、點位 popup 與定位能力的 OpenLayers 地圖。 */
export default function TrafficMapPreview({
  height = { xs: 440, md: 620 },
  city = '臺中市',
  showLocateControl = true,
  showEventCount = true,
  showRoadEvents = true,
  showCctv = true,
  showLiveTraffic = false,
  showVehicleDetectors = false,
  showBikeShare = false,
  showMetro = false,
  showParkingLots = false,
  showParkingSegments = false,
}: TrafficMapPreviewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  // OpenLayers 的 Overlay 會把這個節點搬到地圖內部的 overlay container，
  // 不能讓 React 把它當成一般子節點處理（否則 reconcile 時可能對已被搬走
  // 的節點呼叫 insertBefore 而丟出 NotFoundError），所以用 portal 渲染內容。
  const [popupContainer] = useState(() => document.createElement('div'));
  const { mapController } = useTrafficMapContext();
  const roadEventLayer = useRoadEventLayer(city, showRoadEvents);
  const cctvLayer = useCctvLayer(city, showCctv);
  const liveTrafficLayer = useLiveTrafficLayer(city, showLiveTraffic);
  const vdLayer = useVdLayer(city, showVehicleDetectors);
  const bikeLayer = useBikeLayer(city, showBikeShare);
  const metroLayer = useMetroLayer(city, showMetro);
  const parkingLotLayer = useParkingLotLayer(city, showParkingLots);
  const parkingSegmentLayer = useParkingSegmentLayer(city, showParkingSegments);
  const reloadBikeStation = useReloadBikeStation(city);
  const reloadVd = useReloadVd(city);
  const reloadMetroStation = useReloadMetroStation(city);
  const reloadParkingLot = useReloadParkingLot(city);
  const reloadParkingSegment = useReloadParkingSegment(city);
  const { isLoading, selectedFeature, closePopup } = useTrafficMap({
    mapContainer,
    popupContainer,
    mapController,
    roadEventLayer,
    cctvLayer,
    liveTrafficLayer,
    vdLayer,
    bikeLayer,
    metroLayer,
    parkingLotLayer,
    parkingSegmentLayer,
    showRoadEvents,
    showCctv,
    showLiveTraffic,
    showVehicleDetectors,
    showBikeShare,
    showMetro,
    showParkingLots,
    showParkingSegments,
  });

  // 打開 YouBike popup 的當下順便刷新該站，不做成持續輪詢。
  // 依賴只放 id（原始值），不是整個 selectedFeature：reload 成功後
  // useTrafficMap 會把 selectedFeature.data 換成新物件（同 id），若依賴整個物件，
  // 物件參照一變就會被視為「又選了一個點」，變成開一次 popup 觸發無限次刷新。
  const selectedBikeId = selectedFeature?.kind === 'bike' ? selectedFeature.data.id : null;
  useEffect(() => {
    if (selectedBikeId) reloadBikeStation.mutate(selectedBikeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBikeId]);

  // 開 VD popup 的當下順便刷新該點，理由與依賴設計同 YouBike。
  const selectedVdId = selectedFeature?.kind === 'vd' ? selectedFeature.data.id : null;
  useEffect(() => {
    if (selectedVdId) reloadVd.mutate(selectedVdId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVdId]);

  // 開捷運／輕軌 popup 的當下順便刷新該站，理由與依賴設計同 YouBike／VD。
  const selectedMetroId = selectedFeature?.kind === 'metro' ? selectedFeature.data.id : null;
  useEffect(() => {
    if (selectedMetroId) reloadMetroStation.mutate(selectedMetroId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMetroId]);

  // 開戶外停車場 popup 的當下順便刷新該站，理由與依賴設計同 YouBike／VD／捷運。
  const selectedParkingLotId =
    selectedFeature?.kind === 'parkingLot' ? selectedFeature.data.id : null;
  useEffect(() => {
    if (selectedParkingLotId) reloadParkingLot.mutate(selectedParkingLotId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedParkingLotId]);

  // 開路邊停車格 popup 的當下順便刷新該路段，理由與依賴設計同其他點位圖層。
  const selectedParkingSegmentId =
    selectedFeature?.kind === 'parkingSegment' ? selectedFeature.data.id : null;
  useEffect(() => {
    if (selectedParkingSegmentId) reloadParkingSegment.mutate(selectedParkingSegmentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedParkingSegmentId]);

  // TODO: 圖層讀取失敗／定位失敗的錯誤提示 UI 待重新設計，目前先不顯示。
  const locateUser = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        mapController.flyTo([coords.longitude, coords.latitude], 15),
      () => undefined,
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <Box
      sx={{
        position: 'relative',
        height,
        width: '100%',
        overflow: 'hidden',
        bgcolor: '#DCE8E5',
      }}
    >
      <Box
        ref={mapContainer}
        sx={{
          position: 'absolute',
          inset: 0,
          '& .ol-zoom': { top: 1, left: 1 },
          '& .ol-attribution': {
            fontSize: typographyTokens.fontSize.metadata,
          },
        }}
        aria-label="臺灣即時路況地圖"
      />
      {isLoading && (
        <Box
          role="status"
          aria-label="正在載入地圖"
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'rgba(242,245,244,.76)',
            zIndex: 2,
          }}
        >
          <CircularProgress color="secondary" />
        </Box>
      )}

      {showLocateControl && (
        <IconButton
          onClick={locateUser}
          aria-label="定位到我的位置"
          sx={{
            position: 'absolute',
            right: 16,
            top: 16,
            zIndex: 3,
            bgcolor: 'background.paper',
            color: 'primary.main',
            boxShadow: shadowTokens.control,
            '&:hover': { bgcolor: 'background.paper' },
          }}
        >
          <MyLocationRoundedIcon />
        </IconButton>
      )}
      {createPortal(
        <>
          {selectedFeature?.kind === 'event' && (
            <RoadEventPopupCard
              event={selectedFeature.data}
              onClose={closePopup}
            />
          )}
          {selectedFeature?.kind === 'cctv' && (
            <CctvPopupCard
              key={selectedFeature.data.id}
              cctv={selectedFeature.data}
              onClose={closePopup}
            />
          )}
          {selectedFeature?.kind === 'liveTraffic' && (
            <LiveTrafficPopupCard
              segment={selectedFeature.data}
              onClose={closePopup}
            />
          )}
          {selectedFeature?.kind === 'vd' && (
            <VdPopupCard
              key={selectedFeature.data.id}
              vd={selectedFeature.data}
              onClose={closePopup}
              onReload={() => reloadVd.mutate(selectedFeature.data.id)}
              isReloading={
                reloadVd.isPending && reloadVd.variables === selectedFeature.data.id
              }
              reloadFailed={
                reloadVd.isError && reloadVd.variables === selectedFeature.data.id
              }
            />
          )}
          {selectedFeature?.kind === 'bike' && (
            <BikePopupCard
              key={selectedFeature.data.id}
              bike={selectedFeature.data}
              onClose={closePopup}
              onReload={() => reloadBikeStation.mutate(selectedFeature.data.id)}
              isReloading={
                reloadBikeStation.isPending &&
                reloadBikeStation.variables === selectedFeature.data.id
              }
              reloadFailed={
                reloadBikeStation.isError &&
                reloadBikeStation.variables === selectedFeature.data.id
              }
            />
          )}
          {selectedFeature?.kind === 'metro' && (
            <MetroPopupCard
              key={selectedFeature.data.id}
              metro={selectedFeature.data}
              onClose={closePopup}
              onReload={() => reloadMetroStation.mutate(selectedFeature.data.id)}
              isReloading={
                reloadMetroStation.isPending &&
                reloadMetroStation.variables === selectedFeature.data.id
              }
              reloadFailed={
                reloadMetroStation.isError &&
                reloadMetroStation.variables === selectedFeature.data.id
              }
            />
          )}
          {selectedFeature?.kind === 'parkingLot' && (
            <ParkingLotPopupCard
              key={selectedFeature.data.id}
              parkingLot={selectedFeature.data}
              onClose={closePopup}
              onReload={() => reloadParkingLot.mutate(selectedFeature.data.id)}
              isReloading={
                reloadParkingLot.isPending &&
                reloadParkingLot.variables === selectedFeature.data.id
              }
              reloadFailed={
                reloadParkingLot.isError &&
                reloadParkingLot.variables === selectedFeature.data.id
              }
            />
          )}
          {selectedFeature?.kind === 'parkingSegment' && (
            <ParkingSegmentPopupCard
              key={selectedFeature.data.id}
              parkingSegment={selectedFeature.data}
              onClose={closePopup}
              onReload={() => reloadParkingSegment.mutate(selectedFeature.data.id)}
              isReloading={
                reloadParkingSegment.isPending &&
                reloadParkingSegment.variables === selectedFeature.data.id
              }
              reloadFailed={
                reloadParkingSegment.isError &&
                reloadParkingSegment.variables === selectedFeature.data.id
              }
            />
          )}
        </>,
        popupContainer,
      )}
      {showEventCount && (
        <Chip
          role="status"
          label={`${roadEventLayer.points.length} 件事件・自動聚合`}
          size="small"
          sx={{
            position: 'absolute',
            right: 12,
            bottom: 28,
            zIndex: 3,
            bgcolor: 'rgba(16,47,58,.9)',
            color: '#FFFFFF',
            fontSize: typographyTokens.fontSize.metadata,
          }}
        />
      )}
    </Box>
  );
}
