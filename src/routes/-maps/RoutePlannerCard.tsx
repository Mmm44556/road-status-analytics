import { useRef, useState, type ReactNode } from 'react';
import { DragDropProvider, type DragEndEvent } from '@dnd-kit/react';
import { isSortable } from '@dnd-kit/react/sortable';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AddLocationAltRoundedIcon from '@mui/icons-material/AddLocationAltRounded';
import DirectionsBikeRoundedIcon from '@mui/icons-material/DirectionsBikeRounded';
import DirectionsCarRoundedIcon from '@mui/icons-material/DirectionsCarRounded';
import DirectionsTransitRoundedIcon from '@mui/icons-material/DirectionsTransitRounded';
import DirectionsWalkRoundedIcon from '@mui/icons-material/DirectionsWalkRounded';
import RouteRoundedIcon from '@mui/icons-material/RouteRounded';
import { radiusTokens, shadowTokens, typographyTokens } from '@/config/designTokens';
import { searchPlaces, type PlaceSearchResult } from '@/service/placeSearchApi';
import {
  calculateRoute,
  type RouteCoordinate,
  type RouteResult,
  type RouteTravelMode,
} from '@/service/routeApi';
import RouteWaypointField from './RouteWaypointField';
import RouteStopoverField from './RouteStopoverField';
import { moveStopover, moveStopoverToIndex } from './routeStopovers';
import type { RouteEventAnalysisState } from '@/service/map/features/routeEventAnalysis';
import {
  formatRouteDistance,
  formatRouteDuration,
} from './routePlannerPresentation';
import { createAsyncRequestLock } from '@/utils/asyncRequestLock';

type RouteWaypoint = RouteCoordinate & { label: string };
type EndpointField = 'origin' | 'destination';
type RouteStopover = {
  id: string;
  query: string;
  waypoint: RouteWaypoint | null;
  results: PlaceSearchResult[];
};

const MAX_STOPOVERS = 3;
const travelModeOptions: Array<{
  value: RouteTravelMode;
  label: string;
  icon: ReactNode;
}> = [
  { value: 'drive', label: '汽車', icon: <DirectionsCarRoundedIcon /> },
  { value: 'transit', label: '大眾運輸', icon: <DirectionsTransitRoundedIcon /> },
  { value: 'bicycle', label: '自行車', icon: <DirectionsBikeRoundedIcon /> },
  { value: 'walk', label: '步行', icon: <DirectionsWalkRoundedIcon /> },
];

type RoutePlannerCardProps = {
  city: string | null;
  onClose: () => void;
  onRouteChange: (route: RouteResult | null) => void;
  route: RouteResult | null;
  routeAnalysis: RouteEventAnalysisState;
  routeCountyNames: string[];
  onUseCurrentLocation: () => Promise<RouteCoordinate>;
  onError: (message: string) => void;
};

/** 提供起終點搜尋、目前位置與汽車路線規劃。 */
export default function RoutePlannerCard({
  city,
  onClose,
  onRouteChange,
  route,
  routeAnalysis,
  routeCountyNames,
  onUseCurrentLocation,
  onError,
}: RoutePlannerCardProps) {
  const [queries, setQueries] = useState({ origin: '', destination: '' });
  const [waypoints, setWaypoints] = useState<{
    origin: RouteWaypoint | null;
    destination: RouteWaypoint | null;
  }>({ origin: null, destination: null });
  const [results, setResults] = useState<{
    origin: PlaceSearchResult[];
    destination: PlaceSearchResult[];
  }>({ origin: [], destination: [] });
  const [stopovers, setStopovers] = useState<RouteStopover[]>([]);
  const [travelMode, setTravelMode] = useState<RouteTravelMode>('drive');
  const [searchingField, setSearchingField] = useState<string | null>(null);
  const stopoverSequence = useRef(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const searchRequestLock = useRef(createAsyncRequestLock()).current;
  const routeRequestLock = useRef(createAsyncRequestLock()).current;
  const isWaypointSearchPending = searchingField !== null;

  const updateStopover = (
    id: string,
    update: (stopover: RouteStopover) => RouteStopover,
  ) => {
    setStopovers((current) =>
      current.map((stopover) => (stopover.id === id ? update(stopover) : stopover)),
    );
  };

  const searchWaypoint = async (field: EndpointField | string) => {
    await searchRequestLock.run(async () => {
      const isEndpoint = field === 'origin' || field === 'destination';
      const stopover = isEndpoint
        ? null
        : stopovers.find(({ id }) => id === field);
      const query = (isEndpoint ? queries[field] : stopover?.query ?? '').trim();
      if (!query) {
        const label = field === 'origin'
          ? '起點'
          : field === 'destination'
            ? '目的地'
            : '途經點';
        onError(`請輸入${label}。`);
        return;
      }
      setSearchingField(field);
      try {
        const nextResults = await searchPlaces(query, city);
        if (isEndpoint) {
          setResults((current) => ({ ...current, [field]: nextResults }));
        } else {
          updateStopover(field, (current) => ({ ...current, results: nextResults }));
        }
        if (!nextResults.length) onError('找不到符合條件的地點。');
      } catch {
        onError('地點搜尋服務暫時無法使用，請稍後再試。');
      } finally {
        setSearchingField(null);
      }
    });
  };

  const selectWaypoint = (
    field: EndpointField | string,
    result: PlaceSearchResult,
  ) => {
    const waypoint = {
      label: result.name,
      longitude: result.longitude,
      latitude: result.latitude,
    };
    if (field !== 'origin' && field !== 'destination') {
      updateStopover(field, (current) => ({
        ...current,
        query: result.name,
        waypoint,
        results: [],
      }));
      onRouteChange(null);
      return;
    }
    setQueries((current) => ({ ...current, [field]: result.name }));
    setWaypoints((current) => ({
      ...current,
      [field]: waypoint,
    }));
    setResults((current) => ({ ...current, [field]: [] }));
    onRouteChange(null);
  };

  const handleUseCurrentLocation = async () => {
    try {
      const coordinate = await onUseCurrentLocation();
      setQueries((current) => ({ ...current, origin: '我的位置' }));
      setWaypoints((current) => ({
        ...current,
        origin: { ...coordinate, label: '我的位置' },
      }));
      setResults((current) => ({ ...current, origin: [] }));
    } catch {
      onError('無法取得目前位置，請檢查瀏覽器定位權限。');
    }
  };

  const planRoute = async () => {
    await routeRequestLock.run(async () => {
      if (!waypoints.origin || !waypoints.destination) {
        onError('請先選擇起點與目的地。');
        return;
      }
      if (stopovers.some(({ waypoint }) => waypoint === null)) {
        onError('請先選擇所有途經點，或移除未完成的途經點。');
        return;
      }
      setIsCalculating(true);
      try {
        const routeWaypoints = [
          waypoints.origin,
          ...stopovers.map(({ waypoint }) => waypoint as RouteWaypoint),
          waypoints.destination,
        ];
        const nextRoute = await calculateRoute(routeWaypoints, travelMode);
        onRouteChange(nextRoute);
      } catch {
        onError('路線規劃失敗，請確認地點後再試一次。');
      } finally {
        setIsCalculating(false);
      }
    });
  };

  const clearRoute = () => {
    setQueries({ origin: '', destination: '' });
    setWaypoints({ origin: null, destination: null });
    setResults({ origin: [], destination: [] });
    setStopovers([]);
    onRouteChange(null);
  };

  /** 切換交通方式並清除不再相符的既有路線。 */
  const changeTravelMode = (nextMode: RouteTravelMode | null) => {
    if (!nextMode || nextMode === travelMode) return;
    setTravelMode(nextMode);
    onRouteChange(null);
  };

  const addStopover = () => {
    if (stopovers.length >= MAX_STOPOVERS) return;
    stopoverSequence.current += 1;
    setStopovers((current) => [
      ...current,
      {
        id: `stopover-${stopoverSequence.current}`,
        query: '',
        waypoint: null,
        results: [],
      },
    ]);
    onRouteChange(null);
  };

  const removeStopover = (id: string) => {
    setStopovers((current) => current.filter((stopover) => stopover.id !== id));
    onRouteChange(null);
  };

  const changeStopoverOrder = (next: RouteStopover[]) => {
    setStopovers(next);
    onRouteChange(null);
  };

  /** 套用 dnd-kit 完成後的途經點順序。 */
  const handleStopoverDragEnd = (event: DragEndEvent) => {
    if (event.canceled) return;
    const { source } = event.operation;
    if (!isSortable(source)) return;
    changeStopoverOrder(
      moveStopoverToIndex(stopovers, source.initialIndex, source.index),
    );
  };

  return (
    <Paper
      component="section"
      aria-label="路線規劃"
      sx={{
        position: 'absolute',
        zIndex: 7,
        top: { xs: 72, sm: 84 },
        left: { xs: 12, md: 16 },
        width: { xs: 'calc(100% - 24px)', sm: 380 },
        maxHeight: 'calc(100% - 108px)',
        overflowY: 'auto',
        p: 2,
        borderRadius: radiusTokens.floating,
        boxShadow: shadowTokens.panel,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography component="h2" fontWeight={700} fontSize={typographyTokens.fontSize.title}>
            路線規劃
          </Typography>
          <Typography color="text.secondary" fontSize={typographyTokens.fontSize.metadata}>
            選擇交通方式並安排最多三個途經點
          </Typography>
        </Box>
        <Button size="small" startIcon={<CloseRoundedIcon />} onClick={onClose}>
          關閉
        </Button>
      </Stack>
      <Stack spacing={1.5} mt={2}>
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={travelMode}
          aria-label="交通方式"
          onChange={(_, nextMode: RouteTravelMode | null) => changeTravelMode(nextMode)}
        >
          {travelModeOptions.map((option) => (
            <ToggleButton
              key={option.value}
              value={option.value}
              aria-label={option.label}
              disabled={isCalculating}
              sx={{ flexDirection: 'column', gap: 0.25, py: 0.75 }}
            >
              {option.icon}
              <Box component="span">{option.label}</Box>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <RouteWaypointField
          label="起點"
          value={queries.origin}
          results={results.origin}
          isSearching={searchingField === 'origin'}
          disabled={isWaypointSearchPending || isCalculating}
          allowCurrentLocation
          onChange={(value) => {
            setQueries((current) => ({ ...current, origin: value }));
            setWaypoints((current) => ({ ...current, origin: null }));
          }}
          onSearch={() => void searchWaypoint('origin')}
          onSelect={(result) => selectWaypoint('origin', result)}
          onUseCurrentLocation={() => void handleUseCurrentLocation()}
        />
        <DragDropProvider onDragEnd={handleStopoverDragEnd}>
          {stopovers.map((stopover, index) => (
            <RouteStopoverField
              key={stopover.id}
              id={stopover.id}
              index={index}
              value={stopover.query}
              results={stopover.results}
              isSearching={searchingField === stopover.id}
              disabled={isWaypointSearchPending || isCalculating}
              isFirst={index === 0}
              isLast={index === stopovers.length - 1}
              onChange={(value) => {
                updateStopover(stopover.id, (current) => ({
                  ...current,
                  query: value,
                  waypoint: null,
                }));
                onRouteChange(null);
              }}
              onSearch={() => void searchWaypoint(stopover.id)}
              onSelect={(result) => selectWaypoint(stopover.id, result)}
              onRemove={() => removeStopover(stopover.id)}
              onMove={(offset) =>
                changeStopoverOrder(moveStopover(stopovers, stopover.id, offset))
              }
            />
          ))}
        </DragDropProvider>
        <Button
          variant="text"
          size="small"
          startIcon={<AddLocationAltRoundedIcon />}
          disabled={
            stopovers.length >= MAX_STOPOVERS ||
            isWaypointSearchPending ||
            isCalculating
          }
          onClick={addStopover}
          sx={{ alignSelf: 'flex-start' }}
        >
          新增途經點（{stopovers.length}/{MAX_STOPOVERS}）
        </Button>
        <RouteWaypointField
          label="目的地"
          value={queries.destination}
          results={results.destination}
          isSearching={searchingField === 'destination'}
          disabled={isWaypointSearchPending || isCalculating}
          onChange={(value) => {
            setQueries((current) => ({ ...current, destination: value }));
            setWaypoints((current) => ({ ...current, destination: null }));
          }}
          onSearch={() => void searchWaypoint('destination')}
          onSelect={(result) => selectWaypoint('destination', result)}
        />
        <Stack direction="row" spacing={1}>
          <Button
            fullWidth
            variant="contained"
            startIcon={isCalculating ? <CircularProgress size={16} color="inherit" /> : <RouteRoundedIcon />}
            disabled={isCalculating || isWaypointSearchPending}
            onClick={() => void planRoute()}
          >
            規劃路線
          </Button>
          <Button variant="outlined" onClick={clearRoute}>清除</Button>
        </Stack>
      </Stack>
      {route && (
        <>
          <Divider sx={{ my: 2 }} />
          <Stack direction="row" spacing={3}>
            <Box>
              <Typography color="text.secondary" fontSize={typographyTokens.fontSize.metadata}>距離</Typography>
              <Typography fontWeight={700}>{formatRouteDistance(route.distanceMeters)}</Typography>
            </Box>
            <Box>
              <Typography color="text.secondary" fontSize={typographyTokens.fontSize.metadata}>預估時間</Typography>
              <Typography fontWeight={700}>{formatRouteDuration(route.durationSeconds)}</Typography>
            </Box>
          </Stack>
          <Typography mt={1.5} color="text.secondary" fontSize={typographyTokens.fontSize.metadata}>
            路線資料由{' '}
            <Link href="https://www.geoapify.com/" target="_blank" rel="noreferrer">Geoapify</Link>
            {' '}提供
          </Typography>
          {route.travelMode === 'transit' && route.isApproximated && (
            <Typography mt={1} color="warning.main" fontSize={typographyTokens.fontSize.metadata}>
              此路線依 OSM 大眾運輸資料推估，不代表即時班次或實際轉乘時間。
            </Typography>
          )}
          {routeCountyNames.length > 0 && (
            <Typography mt={1} color="text.secondary" fontSize={typographyTokens.fontSize.metadata}>
              路線模式：{routeCountyNames.join('、')}
            </Typography>
          )}
          {route.travelMode === 'drive' && <Divider sx={{ my: 1.5 }} />}
          {route.travelMode === 'drive' && (
            <Typography component="h3" fontWeight={700} fontSize={typographyTokens.fontSize.body}>
              沿途交通事件
            </Typography>
          )}
          {route.travelMode === 'drive' && routeAnalysis.status === 'loading' && (
            <Stack direction="row" spacing={1} alignItems="center" mt={1} role="status">
              <CircularProgress size={16} />
              <Typography color="text.secondary" fontSize={typographyTokens.fontSize.metadata}>
                正在分析路線附近事件
              </Typography>
            </Stack>
          )}
          {route.travelMode === 'drive' && routeAnalysis.status === 'error' && (
            <Typography mt={1} color="error.main" fontSize={typographyTokens.fontSize.metadata}>
              無法取得沿途交通事件，請稍後再試
            </Typography>
          )}
          {route.travelMode === 'drive' && routeAnalysis.status === 'ready' && routeAnalysis.analysis.total === 0 && (
            <Typography mt={1} color="text.secondary" fontSize={typographyTokens.fontSize.metadata}>
              路線 300 公尺範圍內目前沒有交通事件
            </Typography>
          )}
          {route.travelMode === 'drive' && routeAnalysis.status === 'ready' && routeAnalysis.analysis.total > 0 && (
            <Stack direction="row" spacing={1} mt={1} useFlexGap flexWrap="wrap">
              {routeAnalysis.analysis.counts.map((item) => (
                <Box
                  key={item.eventType}
                  sx={{
                    px: 1.25,
                    py: 0.75,
                    bgcolor: 'background.default',
                    borderRadius: radiusTokens.control,
                  }}
                >
                  <Typography fontWeight={700} fontSize={typographyTokens.fontSize.metadata}>
                    {item.label} {item.count}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </>
      )}
    </Paper>
  );
}
