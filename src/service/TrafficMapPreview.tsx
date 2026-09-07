import { useEffect, useMemo, useRef, useState } from 'react';
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
import { useMetroLayer } from '@/service/map/layers/useMetroLayer';
import { useBusLayer } from '@/service/map/layers/useBusLayer';
import { useParkingLotLayer } from '@/service/map/layers/useParkingLotLayer';
import { useParkingSegmentLayer } from '@/service/map/layers/useParkingSegmentLayer';
import { useTrafficMap } from '@/service/map/useTrafficMap';
import SelectedFeaturePopup from '@/service/map/popups/SelectedFeaturePopup';
import { getLayerStatuses } from '@/service/map/layerErrors';
import { useSelectedFeatureRefresh } from '@/service/map/selectedFeatureRefresh';
import { useLayerStatusSnackbars } from '@/service/map/useLayerStatusSnackbars';
import type { CountySelection } from '@/service/map/features/countyBoundaries';
import type { TownshipSelection } from '@/service/map/features/townshipBoundaries';
import { DEFAULT_BASEMAP_ID, type BasemapId } from '@/data/basemapCatalog';
import type { RouteResult } from '@/service/routeApi';
import {
  analyzeRouteEvents,
  type RouteEventAnalysisState,
} from '@/service/map/features/routeEventAnalysis';

type TrafficMapPreviewProps = {
  height?: number | string | Record<string, number | string>;
  city?: string | null;
  showLocateControl?: boolean;
  showEventCount?: boolean;
  showRoadEvents?: boolean;
  showCctv?: boolean;
  showLiveTraffic?: boolean;
  showVehicleDetectors?: boolean;
  showBikeShare?: boolean;
  showMetro?: boolean;
  showBus?: boolean;
  showParkingLots?: boolean;
  showParkingSegments?: boolean;
  showBoundaryMask?: boolean;
  showAdministrativeBoundaries?: boolean;
  basemapId?: BasemapId;
  isSelectingCounty?: boolean;
  selectedCountyId?: string | null;
  onSelectCounty?: (county: CountySelection) => void;
  isSelectingTownship?: boolean;
  selectedTownshipId?: string | null;
  onSelectTownship?: (township: TownshipSelection) => void;
  /** 含 geometry 的完整鄉鎮選取，用於交通圖層的前端空間篩選；只有 id 用於地圖高亮的用 selectedTownshipId。 */
  selectedTownship?: TownshipSelection | null;
  route?: RouteResult | null;
  routeCities?: string[];
  onRouteAnalysisChange?: (state: RouteEventAnalysisState) => void;
};

/** 顯示具事件 cluster、點位 popup 與定位能力的 OpenLayers 地圖。 */
export default function TrafficMapPreview({
  height = { xs: 440, md: 620 },
  city = null,
  showLocateControl = true,
  showEventCount = true,
  showRoadEvents = true,
  showCctv = true,
  showLiveTraffic = false,
  showVehicleDetectors = false,
  showBikeShare = false,
  showMetro = false,
  showBus = false,
  showParkingLots = false,
  showParkingSegments = false,
  showBoundaryMask = true,
  showAdministrativeBoundaries = true,
  basemapId = DEFAULT_BASEMAP_ID,
  isSelectingCounty = false,
  selectedCountyId = null,
  onSelectCounty = () => undefined,
  isSelectingTownship = false,
  selectedTownshipId = null,
  onSelectTownship = () => undefined,
  selectedTownship = null,
  route = null,
  routeCities = [],
  onRouteAnalysisChange = () => undefined,
}: TrafficMapPreviewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  // OpenLayers 的 Overlay 會把這個節點搬到地圖內部的 overlay container，
  // 不能讓 React 把它當成一般子節點處理（否則 reconcile 時可能對已被搬走
  // 的節點呼叫 insertBefore 而丟出 NotFoundError），所以用 portal 渲染內容。
  const [popupContainer] = useState(() => document.createElement('div'));
  const { mapController } = useTrafficMapContext();
  const roadEventLayer = useRoadEventLayer(
    city,
    showRoadEvents,
    selectedTownship,
    Boolean(route),
    routeCities,
    route?.geometry ?? null,
  );
  const cctvLayer = useCctvLayer(
    city,
    showCctv,
    selectedTownship,
    routeCities,
    route?.geometry ?? null,
  );
  const liveTrafficLayer = useLiveTrafficLayer(
    city,
    showLiveTraffic,
    selectedTownship,
  );
  const vdLayer = useVdLayer(
    city,
    showVehicleDetectors,
    selectedTownship,
    routeCities,
    route?.geometry ?? null,
  );
  const bikeLayer = useBikeLayer(
    city,
    showBikeShare,
    selectedTownship,
    routeCities,
  );
  const metroLayer = useMetroLayer(
    city,
    showMetro,
    selectedTownship,
    routeCities,
  );
  const busLayer = useBusLayer(city, showBus, selectedTownship, routeCities);
  const parkingLotLayer = useParkingLotLayer(
    city,
    showParkingLots,
    selectedTownship,
  );
  const parkingSegmentLayer = useParkingSegmentLayer(
    city,
    showParkingSegments,
    selectedTownship,
  );
  const routeAnalysis = useMemo(() => {
    if (!route || route.travelMode !== 'drive') return { status: 'idle' } as const;
    if (roadEventLayer.isLoading) return { status: 'loading' } as const;
    if (roadEventLayer.isError) return { status: 'error' } as const;
    return {
      status: 'ready',
      analysis: analyzeRouteEvents(route.geometry, roadEventLayer.allPoints),
    } as const;
  }, [route, roadEventLayer.allPoints, roadEventLayer.isError, roadEventLayer.isLoading]);

  useEffect(() => {
    onRouteAnalysisChange(routeAnalysis);
  }, [onRouteAnalysisChange, routeAnalysis]);
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
    busLayer,
    parkingLotLayer,
    parkingSegmentLayer,
    showRoadEvents,
    showCctv,
    showLiveTraffic,
    showVehicleDetectors,
    showBikeShare,
    showMetro,
    showBus,
    showParkingLots,
    showParkingSegments,
    showBoundaryMask,
    showAdministrativeBoundaries,
    basemapId,
    isSelectingCounty,
    selectedCountyId,
    onSelectCounty,
    isSelectingTownship,
    selectedTownshipId,
    onSelectTownship,
    route,
  });

  const selectedFeatureRefresh = useSelectedFeatureRefresh(
    city,
    selectedFeature,
  );
  const layerStatuses = getLayerStatuses(
    {
      roadEvents: showRoadEvents && roadEventLayer.isError,
      cctv: showCctv && cctvLayer.isError,
      liveTraffic: showLiveTraffic && liveTrafficLayer.isError,
      vehicleDetectors: showVehicleDetectors && vdLayer.isError,
      bikeShare: showBikeShare && bikeLayer.isError,
      metro: showMetro && metroLayer.isError,
      bus: showBus && busLayer.isError,
      parkingLots: showParkingLots && parkingLotLayer.isError,
      parkingSegments: showParkingSegments && parkingSegmentLayer.isError,
    },
    {
      roadEvents: roadEventLayer.isLoading,
      cctv: cctvLayer.isLoading,
      liveTraffic: liveTrafficLayer.isLoading,
      vehicleDetectors: vdLayer.isLoading,
      bikeShare: bikeLayer.isLoading,
      metro: metroLayer.isLoading,
      bus: busLayer.isLoading,
      parkingLots: parkingLotLayer.isLoading,
      parkingSegments: parkingSegmentLayer.isLoading,
    },
  );
  useLayerStatusSnackbars(layerStatuses);

  // 頁面工具列已有定位錯誤提示；此控制僅供獨立使用地圖元件時啟用。
  const locateUser = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const coordinate: [number, number] = [
          coords.longitude,
          coords.latitude,
        ];
        mapController.setUserLocation(coordinate);
        mapController.flyTo(coordinate, 15);
      },
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
        bgcolor: 'background.default',
      }}
    >
      <Box
        ref={mapContainer}
        sx={{
          position: 'absolute',
          inset: 0,
          '& .ol-zoom': { top: 1, left: 1 },
          '& .ol-attribution': {
            right: 1.5,
            bottom: 1.5,
            maxWidth: 'calc(100% - 24px)',
            fontSize: typographyTokens.fontSize.metadata,
          },
          '& .ol-scale-line': {
            right: 1.5,
            bottom: { xs: 8, sm: 28 },
            left: 'auto',
            borderRadius: 0,
            bgcolor: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(6px)',
            opacity: 0.75,
          },
          '& .ol-scale-line-inner': {
            fontSize: typographyTokens.fontSize.metadata,
            fontWeight: 600,
            color: 'text.primary',
            borderColor: 'text.primary',
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
            bgcolor: 'rgba(243,247,250,.78)',
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
        <SelectedFeaturePopup
          selectedFeature={selectedFeature}
          refresh={selectedFeatureRefresh}
          onClose={closePopup}
        />,
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
            bgcolor: 'rgba(6,43,91,.92)',
            color: '#FFFFFF',
            fontSize: typographyTokens.fontSize.metadata,
          }}
        />
      )}
    </Box>
  );
}
