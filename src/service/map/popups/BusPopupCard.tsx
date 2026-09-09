import { useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AltRouteRoundedIcon from '@mui/icons-material/AltRouteRounded';
import { tooltipSlots, typographyTokens } from '@/config/designTokens';
import { uiColors } from '@/config/semanticColors';
import {
  getBusArrivalTimeLabel,
  useBusArrivals,
  useBusRouteShape,
  type BusArrival,
} from '@/service/busApi';
import type { BusMapPoint } from '@/service/map/features/busFeatures';
import { trafficLayerCatalog } from '@/data/trafficLayerCatalog';
import MapPopupCard from '@/service/map/popups/MapPopupCard';
import { useTrafficMapContext } from '@/hooks/useGetContext';
import { formatDateTime } from '@/utils/dateTime';

type BusPopupCardProps = { bus: BusMapPoint; onClose: () => void };

const busLayerColor =
  trafficLayerCatalog.find((layer) => layer.id === 'bus')?.color ?? '#7857A4';

/** 同時查看多條路線時的可辨識色盤，依點擊順序分配、重複點擊同一路線沿用同色。 */
const ROUTE_COLOR_PALETTE = Object.values(uiColors.event).map((c) => c.main);
const routeColorAssignments = new Map<string, string>();

function getRouteColor(routeKey: string): string {
  const assigned = routeColorAssignments.get(routeKey);
  if (assigned) return assigned;
  const color =
    ROUTE_COLOR_PALETTE[routeColorAssignments.size % ROUTE_COLOR_PALETTE.length];
  routeColorAssignments.set(routeKey, color);
  return color;
}

function getRouteKey(routeId: string, direction: number) {
  return `${routeId}:${direction}`;
}

/** 取得路線方向說明，優先顯示 TDX 路線起訖站。 */
function getDestinationLabel(direction: number, destination: string) {
  if (destination) return `往 ${destination}`;
  return direction === 0 ? '去程' : '返程';
}

/** 公車站牌 popup：開啟時才查詢該站的即時預估到站資訊。 */
export default function BusPopupCard({ bus, onClose }: BusPopupCardProps) {
  const { mapController } = useTrafficMapContext();
  const arrivalsQuery = useBusArrivals(bus.city, bus.id);
  const routeShape = useBusRouteShape();
  const [activeRouteKeys, setActiveRouteKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const arrivals = arrivalsQuery.data?.data.arrivals ?? [];
  const latestUpdateTime = arrivals
    .map((arrival) => arrival.updateTime)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  /** 查詢該路線＋方向的行駛路徑，畫在地圖上；再次點擊同一路線則從地圖移除。 */
  const showRouteOnMap = (arrival: BusArrival) => {
    const routeKey = getRouteKey(arrival.routeId, arrival.direction);
    if (activeRouteKeys.has(routeKey)) {
      mapController.hideGeometry(`bus-route:${routeKey}`);
      setActiveRouteKeys((current) => {
        const next = new Set(current);
        next.delete(routeKey);
        return next;
      });
      return;
    }

    routeShape.mutate(
      {
        city: bus.city,
        routeId: arrival.routeId,
        direction: arrival.direction,
      },
      {
        onSuccess: (result) => {
          const key = getRouteKey(result.data.routeId, result.data.direction);
          mapController.showGeometry({
            id: `bus-route:${key}`,
            type: 'linestring',
            coordinates: result.data.coordinates,
            color: getRouteColor(key),
            label: result.data.routeName || undefined,
          });
          setActiveRouteKeys((current) => new Set(current).add(key));
        },
      },
    );
  };

  return (
    <MapPopupCard
      ariaLabel="公車站牌即時到站資訊"
      closeLabel="關閉公車站牌資訊"
      title={bus.name || '未提供站名'}
      onClose={onClose}
      
    >
      {bus.address && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 0.25 }}
        >
          {bus.address}
        </Typography>
      )}

      {arrivalsQuery.isLoading && (
        <Box
          role="status"
          sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}
        >
          <CircularProgress size={16} />
          <Typography sx={{ fontSize: typographyTokens.fontSize.caption }}>
            讀取即時到站資訊
          </Typography>
        </Box>
      )}

      {arrivalsQuery.isError && (
        <Typography
          role="alert"
          sx={{
            py: 2,
            color: 'error.main',
            fontSize: typographyTokens.fontSize.caption,
          }}
        >
          到站資訊讀取失敗，請稍後再試
        </Typography>
      )}

      {arrivalsQuery.isSuccess && arrivals.length === 0 && (
        <Typography
          sx={{
            py: 2,
            color: 'text.secondary',
            fontSize: typographyTokens.fontSize.caption,
          }}
        >
          目前沒有行經此站的到站資訊
        </Typography>
      )}

      {arrivals.length > 0 && (
        <Box
          aria-label="公車預估到站列表"
          sx={{
            mt: 1.5,
            // maxHeight: 320,
            overflowY: 'auto',
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          {arrivals.map((arrival, index) => {
            const isThisRoute =
              routeShape.variables?.routeId === arrival.routeId &&
              routeShape.variables?.direction === arrival.direction;
            const isLoadingRoute = routeShape.isPending && isThisRoute;
            const routeFailed = routeShape.isError && isThisRoute;
            const routeKey = getRouteKey(arrival.routeId, arrival.direction);
            const isRouteActive = activeRouteKeys.has(routeKey);
            const routeColor = isRouteActive
              ? getRouteColor(routeKey)
              : busLayerColor;
            return (
              <Box
                key={`${arrival.routeId}-${arrival.direction}-${index}`}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto auto',
                  alignItems: 'center',
                  gap: 1,
                  py: 1,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    minWidth: 0,
                  }}
                >
                  <Chip
                    label={arrival.routeName || '未命名'}
                    size="small"
                    color="primary"
                    sx={{ fontWeight: typographyTokens.fontWeight.bold }}
                  />
                  <Typography
                    noWrap
                    title={getDestinationLabel(
                      arrival.direction,
                      arrival.destination,
                    )}
                    sx={{
                      minWidth: 0,
                      fontSize: typographyTokens.fontSize.caption,
                    }}
                  >
                    {getDestinationLabel(
                      arrival.direction,
                      arrival.destination,
                    )}
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    color:
                      arrival.stopStatus === 0
                        ? 'primary.main'
                        : 'text.secondary',
                    fontSize: typographyTokens.fontSize.caption,
                    fontWeight: typographyTokens.fontWeight.bold,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {getBusArrivalTimeLabel(arrival)}
                </Typography>
                <Tooltip
                  title={
                    routeFailed
                      ? '路線查詢失敗，請再試一次'
                      : isRouteActive
                        ? '從地圖上移除這條路線'
                        : '在地圖上查看這條路線'
                  }
                  slotProps={tooltipSlots}
                >
                  <span>
                    <IconButton
                      size="small"
                      aria-label={`在地圖上查看 ${arrival.routeName || '此'} 路線`}
                      onClick={() => showRouteOnMap(arrival)}
                      disabled={isLoadingRoute}
                      sx={{
                        color: routeFailed
                          ? 'error.main'
                          : isRouteActive
                            ? '#FFFFFF'
                            : routeColor,
                        bgcolor: isRouteActive ? routeColor : 'transparent',
                        '&:hover': {
                          bgcolor: isRouteActive ? routeColor : undefined,
                          opacity: isRouteActive ? 0.85 : 1,
                        },
                      }}
                    >
                      {isLoadingRoute ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <AltRouteRoundedIcon fontSize="small" />
                      )}
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            );
          })}
        </Box>
      )}

      {latestUpdateTime && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 1 }}
        >
          更新時間：{formatDateTime(latestUpdateTime)}
          {arrivalsQuery.isFetching ? '（更新中）' : ''}
        </Typography>
      )}
    </MapPopupCard>
  );
}
