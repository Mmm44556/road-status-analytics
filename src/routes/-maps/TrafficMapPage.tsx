import { lazy, Suspense, useMemo, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Snackbar from '@mui/material/Snackbar';
import TrafficMapPreview from '@/service/TrafficMapPreview';
import { TrafficMapViewContext } from '@/context';
import { createMapController } from '@/service/map/shared/mapController';
import type { TrafficLayerId } from '@/data/trafficLayerCatalog';
import { trafficLayerCatalog } from '@/data/trafficLayerCatalog';
import MapToolbar from './MapToolbar';
import TrafficLegend from './TrafficLegend';
import CountySelectionControl from './CountySelectionControl';
import type { CountySelection } from '@/service/map/features/countyBoundaries';
import type { TownshipSelection } from '@/service/map/features/townshipBoundaries';
import { DEFAULT_BASEMAP_ID, type BasemapId } from '@/data/basemapCatalog';
import {
  searchPlaces,
  type PlaceSearchResult,
} from '@/service/placeSearchApi';
import type { RouteCoordinate, RouteResult } from '@/service/routeApi';
import AiChatFab from './AiChatFab';
import type { AiMapAction } from '@/service/aiChatApi';
import type { RouteEventAnalysisState } from '@/service/map/features/routeEventAnalysis';
import { createAsyncRequestLock } from '@/utils/asyncRequestLock';
import ErrorBoundary from '@/components/ErrorBoundary';
import { getRouteCounties } from '@/service/map/features/routeCounties';
import {
  canToggleLayerInQueryMode,
  getRouteModeVisibleLayers,
  type MapQueryMode,
} from './mapQueryMode';

// 這幾個都不是「看地圖」這件事的必要路徑（圖層選單要點開才用得到、路線
// 規劃卡片本來就是條件渲染、AI 聊天面板／操作導覽也是使用者主動觸發才
// 需要），用 React.lazy 拆成獨立 chunk，才不會讓地圖首次進來要多等這些
// 用不到的程式碼載入完。TrafficMapPreview（實際地圖）維持一般 import，
// 那是唯一真正擋在第一次有畫面之前的東西。
const LayerMenu = lazy(() => import('./LayerMenu'));
const RoutePlannerCard = lazy(() => import('./RoutePlannerCard'));
const AiRouteChatCard = lazy(() => import('./AiRouteChatCard'));
const MapTourButton = lazy(() => import('./MapTourButton'));

/** 圖層預設的可見集合，初始掛載與「重置所有設定」都要用同一份，避免各寫一次兩邊漏改。 */
function getDefaultVisibleLayers(): Set<TrafficLayerId> {
  return new Set(
    trafficLayerCatalog
      .filter((layer) => layer.defaultVisible)
      .map((layer) => layer.id),
  );
}

/** 組合 GIS 地圖、圖層控制與搜尋工具。 */
export default function TrafficMapPage() {
  const mapController = useMemo(() => createMapController(), []);
  const [visibleLayers, setVisibleLayers] = useState<Set<TrafficLayerId>>(
    getDefaultVisibleLayers,
  );
  const areaVisibleLayersRef = useRef(new Set(visibleLayers));
  const [notice, setNotice] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isRoutePlannerOpen, setIsRoutePlannerOpen] = useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeAnalysis, setRouteAnalysis] = useState<RouteEventAnalysisState>({
    status: 'idle',
  });
  const placeSearchRequestLock = useRef(createAsyncRequestLock()).current;
  const [queryMode, setQueryMode] = useState<MapQueryMode>('area');
  const [routeCities, setRouteCities] = useState<string[]>([]);
  const [showBoundaryMask, setShowBoundaryMask] = useState(true);
  const [showAdministrativeBoundaries, setShowAdministrativeBoundaries] =
    useState(true);
  const [basemapId, setBasemapId] = useState<BasemapId>(DEFAULT_BASEMAP_ID);
  const [selectedCounty, setSelectedCounty] = useState<CountySelection | null>(
    null,
  );
  const [selectedTownship, setSelectedTownship] =
    useState<TownshipSelection | null>(null);
  const [isTownshipSelectionComplete, setIsTownshipSelectionComplete] =
    useState(false);

  // 縣市選好、且鄉鎮條件（選定或跳過）完成前，交通圖層不查詢也不可切換。
  const isAreaSelectionComplete = Boolean(
    selectedCounty && isTownshipSelectionComplete,
  );
  const queryCity =
    queryMode === 'area' && isAreaSelectionComplete
      ? (selectedCounty?.name ?? null)
      : null;

  const toggleLayer = (layerId: TrafficLayerId) => {
    if (!canToggleLayer(layerId)) return;
    const layer = trafficLayerCatalog.find((item) => item.id === layerId);
    if (!layer || layer.availability !== 'available') return;
    setVisibleLayers((current) => {
      const next = new Set(current);
      if (next.has(layerId)) next.delete(layerId);
      else next.add(layerId);
      if (queryMode === 'area') areaVisibleLayersRef.current = new Set(next);
      return next;
    });
  };

  /** 依目前查詢模式決定圖層是否具有有效查詢條件。 */
  function canToggleLayer(layerId: TrafficLayerId) {
    return canToggleLayerInQueryMode(
      queryMode,
      layerId,
      isAreaSelectionComplete,
      routeCities.length > 0,
    );
  }

  /** 路線建立後切換模式、推算途經縣市並自動開啟沿途圖層。 */
  const handleRouteChange = (nextRoute: RouteResult | null) => {
    if (!nextRoute) {
      setRoute(null);
      setQueryMode('area');
      setRouteCities([]);
      setRouteAnalysis({ status: 'idle' });
      setVisibleLayers(new Set(areaVisibleLayersRef.current));
      return;
    }
    const counties = getRouteCounties(nextRoute.geometry);
    if (counties.length === 0) {
      setNotice('無法判斷路線經過的縣市。');
      return;
    }
    setRoute(nextRoute);
    setQueryMode('route');
    setRouteCities(counties.map((county) => county.name));
    setVisibleLayers((current) => {
      if (queryMode === 'area') areaVisibleLayersRef.current = new Set(current);
      return getRouteModeVisibleLayers(nextRoute.travelMode);
    });
  };

  /**
   * NavBar 的「重置所有設定」：路線不管是手動規劃還是透過 AI 聊天建立的，
   * 只要 RoutePlannerCard 沒開著就摸不到裡面的「清除」按鈕，先前唯一的
   * 取消方式是再回頭跟 AI 說一次「取消」。這裡不管哪個面板現在開著沒，
   * 直接把整頁狀態打回剛進站時的初始值。
   */
  const resetAll = () => {
    const defaultLayers = getDefaultVisibleLayers();
    areaVisibleLayersRef.current = new Set(defaultLayers);
    setVisibleLayers(defaultLayers);
    setNotice(null);
    setSearchResults([]);
    setIsSearching(false);
    setIsRoutePlannerOpen(false);
    setIsAiChatOpen(false);
    setRoute(null);
    setRouteAnalysis({ status: 'idle' });
    setQueryMode('area');
    setRouteCities([]);
    setShowBoundaryMask(true);
    setShowAdministrativeBoundaries(true);
    setBasemapId(DEFAULT_BASEMAP_ID);
    setSelectedCounty(null);
    setSelectedTownship(null);
    setIsTownshipSelectionComplete(false);
    mapController.fitTaiwan();
  };

  /** 取得目前位置，供定位按鈕與路線起點共用。 */
  const getUserLocation = (): Promise<RouteCoordinate> => {
    if (!navigator.geolocation) {
      return Promise.reject(new Error('Geolocation is not supported'));
    }
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const coordinate: [number, number] = [
            coords.longitude,
            coords.latitude,
          ];
          mapController.setUserLocation(coordinate);
          mapController.flyTo(coordinate, 16);
          resolve({ longitude: coords.longitude, latitude: coords.latitude });
        },
        reject,
        { enableHighAccuracy: true, timeout: 8000 },
      );
    });
  };

  const locateUser = () => {
    void getUserLocation().catch(() => {
      setNotice('無法取得目前位置，請檢查瀏覽器定位權限。');
    });
  };

  /** 搜尋地點並保留候選清單，讓使用者確認同名地點。 */
  const searchPlace = async (query: string) => {
    await placeSearchRequestLock.run(async () => {
      if (!query) {
        setNotice('請輸入地址、道路或地標。');
        return;
      }
      setIsSearching(true);
      setSearchResults([]);
      try {
        const results = await searchPlaces(query, selectedCounty?.name ?? null);
        setSearchResults(results);
        if (results.length === 0) setNotice('找不到符合條件的地點。');
      } catch {
        setNotice('地點搜尋服務暫時無法使用，請稍後再試。');
      } finally {
        setIsSearching(false);
      }
    });
  };

  /** 在地圖標示使用者確認的搜尋結果。 */
  const selectSearchResult = (result: PlaceSearchResult) => {
    const coordinate: [number, number] = [result.longitude, result.latitude];
    setSearchResults([]);
    mapController.setSearchLocation(coordinate);
    mapController.flyTo(coordinate, 17);
  };

  const reselectCounty = () => {
    setSelectedCounty(null);
    setSelectedTownship(null);
    setIsTownshipSelectionComplete(false);
    mapController.fitTaiwan();
  };

  const selectCounty = (county: CountySelection) => {
    setSelectedCounty(county);
    setSelectedTownship(null);
    setIsTownshipSelectionComplete(false);
  };

  const selectTownship = (township: TownshipSelection) => {
    setSelectedTownship(township);
    setIsTownshipSelectionComplete(true);
  };

  const reselectTownship = () => {
    if (!selectedCounty) return;
    setSelectedTownship(null);
    setIsTownshipSelectionComplete(false);
    mapController.fitCounty(selectedCounty.id);
  };

  /**
   * 執行 AI 助理下的結構化地圖動作，並回傳結果摘要供對話接著說明。
   * 動態 import：這份執行器只有使用者真的開口叫 AI 做事才會用到，本來
   * 就是非同步流程（AI 對話本身就要等串流回應），這裡動態載入不會多一個
   * 「使用者感覺得到的等待」，卻能讓地圖首次進站的主要 chunk 少揹一份
   * 平常用不到的程式碼。
   */
  const executeAiMapAction = async (action: AiMapAction) => {
    const { executeAiMapAction: runAiMapAction } = await import(
      './aiMapActionExecutor'
    );
    return runAiMapAction(action, {
      visibleLayers,
      queryMode,
      route,
      canToggleLayer,
      toggleLayer,
      selectSearchResult,
      handleRouteChange,
      setIsRoutePlannerOpen,
      getUserLocation,
      selectCounty,
      selectTownship,
      setIsTownshipSelectionComplete,
      reselectCounty,
      setBasemapId,
    });
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
          bgcolor: 'background.default',
        }}
      >
        <Box
          component="section"
          aria-label="即時交通地圖工作區"
          sx={{ position: 'relative', minWidth: 0, flex: 1 }}
        >
          {/* 地圖這塊牽涉 OpenLayers／hls.js／mpegts.js，複雜度最高、最容易出狀況，
              所以獨立包一層邊界：這裡壞掉只會讓地圖區塊顯示錯誤畫面，
              不會把整頁（含上方導覽列）一起拖下去變空白。 */}
          <ErrorBoundary
            title="地圖發生錯誤"
            description="地圖暫時無法顯示，重新整理頁面通常就能恢復正常。"
          >
            <TrafficMapPreview
              height="100%"
              city={queryCity}
              showLocateControl={false}
              showEventCount={false}
              showRoadEvents={visibleLayers.has('roadEvents')}
              showCctv={visibleLayers.has('cctv')}
              showLiveTraffic={visibleLayers.has('liveTraffic')}
              showVehicleDetectors={visibleLayers.has('vehicleDetectors')}
              showBikeShare={visibleLayers.has('bikeShare')}
              showMetro={visibleLayers.has('metro')}
              showBus={visibleLayers.has('bus')}
              showParkingLots={visibleLayers.has('parkingLots')}
              showParkingSegments={visibleLayers.has('parkingSegments')}
              showBoundaryMask={showBoundaryMask}
              showAdministrativeBoundaries={
                showAdministrativeBoundaries && queryMode === 'area'
              }
              basemapId={basemapId}
              isSelectingCounty={queryMode === 'area' && !selectedCounty}
              selectedCountyId={selectedCounty?.id ?? null}
              onSelectCounty={selectCounty}
              isSelectingTownship={Boolean(
                queryMode === 'area' && selectedCounty && !isTownshipSelectionComplete,
              )}
              selectedTownshipId={selectedTownship?.id ?? null}
              onSelectTownship={selectTownship}
              selectedTownship={selectedTownship}
              route={route}
              routeCities={routeCities}
              onRouteAnalysisChange={setRouteAnalysis}
            />
            <Suspense fallback={null}>
              <LayerMenu
                visibleLayers={visibleLayers}
                showBoundaryMask={showBoundaryMask}
                showAdministrativeBoundaries={showAdministrativeBoundaries}
                onToggle={toggleLayer}
                onToggleBoundaryMask={() =>
                  setShowBoundaryMask((current) => !current)
                }
                onToggleAdministrativeBoundaries={() =>
                  setShowAdministrativeBoundaries((current) => !current)
                }
                canToggleLayer={canToggleLayer}
                basemapId={basemapId}
                onChangeBasemap={setBasemapId}
                onReset={resetAll}
              />
            </Suspense>
            {visibleLayers.has('liveTraffic') && <TrafficLegend />}
            {queryMode === 'area' && (
              <CountySelectionControl
                selectedCounty={selectedCounty}
                selectedTownship={selectedTownship}
                isSelectingTownship={Boolean(
                  selectedCounty && !isTownshipSelectionComplete,
                )}
                onSkipTownship={() => setIsTownshipSelectionComplete(true)}
                onReselectTownship={reselectTownship}
                onReselect={reselectCounty}
              />
            )}
            <MapToolbar
              statusMessage="道路事件服務運作中"
              onLocate={locateUser}
              onSearch={searchPlace}
              searchResults={searchResults}
              onClearResults={() => setSearchResults([])}
              isSearching={isSearching}
              onSelectResult={selectSearchResult}
              isRoutePlannerOpen={isRoutePlannerOpen}
              onToggleRoutePlanner={() =>
                setIsRoutePlannerOpen((current) => !current)
              }
            />
            <AiChatFab
              isOpen={isAiChatOpen}
              onToggle={() => setIsAiChatOpen((current) => !current)}
            />
            <Suspense fallback={null}>
              <MapTourButton />
            </Suspense>
            {isRoutePlannerOpen && (
              <Suspense fallback={null}>
                <RoutePlannerCard
                  city={null}
                  onClose={() => setIsRoutePlannerOpen(false)}
                  onRouteChange={handleRouteChange}
                  route={route}
                  routeAnalysis={routeAnalysis}
                  routeCountyNames={routeCities}
                  onUseCurrentLocation={getUserLocation}
                  onError={setNotice}
                />
              </Suspense>
            )}
            {/* 永遠掛載、用 isOpen 切換顯示，關閉面板不會清掉對話內容。 */}
            <Suspense fallback={null}>
              <AiRouteChatCard
                isOpen={isAiChatOpen}
                onClose={() => setIsAiChatOpen(false)}
                executeAiMapAction={executeAiMapAction}
              />
            </Suspense>
          </ErrorBoundary>
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
