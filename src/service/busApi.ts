import { useMutation, useQueries, useQuery } from '@tanstack/react-query';
import { z } from 'zod';

const busStopSchema = z.object({
  stopId: z.string(),
  name: z.string(),
  address: z.string(),
  positionLon: z.number(),
  positionLat: z.number(),
  updateTime: z.string().nullable().optional(),
});

const busResponseSchema = z.object({
  data: z.object({
    city: z.string(),
    stops: z.array(busStopSchema),
  }),
});
type BusResponse = z.infer<typeof busResponseSchema>;

const busArrivalSchema = z.object({
  routeId: z.string(),
  routeName: z.string(),
  direction: z.number().int(),
  destination: z.string(),
  estimateSeconds: z.number().int().nullable(),
  stopStatus: z.number().int(),
  plateNumber: z.string(),
  nextBusTime: z.string().nullable(),
  isLastBus: z.boolean(),
  updateTime: z.string().nullable(),
});

const busArrivalResponseSchema = z.object({
  data: z.object({
    city: z.string(),
    stopId: z.string(),
    arrivals: z.array(busArrivalSchema),
  }),
});

const busRouteShapeSchema = z.object({
  city: z.string(),
  routeId: z.string(),
  routeName: z.string(),
  direction: z.number().int(),
  coordinates: z.array(z.tuple([z.number(), z.number()])),
  updateTime: z.string().nullable().optional(),
});

const busRouteShapeResponseSchema = z.object({ data: busRouteShapeSchema });

export type BusRouteShape = z.infer<typeof busRouteShapeSchema>;

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');

const combineBusQueries = (
  results: Array<{ data?: BusResponse; isError: boolean; isFetching: boolean }>,
) => ({
  responses: results.flatMap((result) => (result.data ? [result.data] : [])),
  isError: results.some((result) => result.isError),
  isFetching: results.some((result) => result.isFetching),
});

export type BusStop = z.infer<typeof busStopSchema>;
export type BusArrival = z.infer<typeof busArrivalSchema>;

/** 驗證後端公車站牌回應契約。 */
export function parseBusStops(input: unknown) {
  return busResponseSchema.parse(input);
}

/** 驗證後端公車預估到站回應契約。 */
export function parseBusArrivals(input: unknown) {
  return busArrivalResponseSchema.parse(input);
}

/** 將 TDX 秒數與站牌狀態轉成使用者可讀文字。 */
export function getBusArrivalTimeLabel(
  arrival: Pick<BusArrival, 'estimateSeconds' | 'stopStatus'>,
) {
  const statusLabels: Record<number, string> = {
    1: '尚未發車',
    2: '交管不停靠',
    3: '末班車已過',
    4: '今日未營運',
  };
  if (arrival.stopStatus !== 0) {
    return statusLabels[arrival.stopStatus] ?? '暫無到站資訊';
  }
  if (arrival.estimateSeconds === null) return '暫無到站資訊';
  if (arrival.estimateSeconds < 60) return '進站中';
  return `${Math.ceil(arrival.estimateSeconds / 60)} 分鐘`;
}

/** 取得指定縣市的公車站牌。 */
export async function fetchBusStops(city: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ city });
  const response = await fetch(`${apiBaseUrl}/traffic/bus?${params}`, { signal });
  if (!response.ok) throw new Error(`公車站牌 API 回應錯誤 (${response.status})`);
  return parseBusStops(await response.json());
}

/** 取得單一站牌的即時預估到站資訊。 */
export async function fetchBusArrivals(
  city: string,
  stopId: string,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({ city, stop_id: stopId });
  const response = await fetch(`${apiBaseUrl}/traffic/bus/arrivals?${params}`, {
    signal,
  });
  if (!response.ok) {
    throw new Error(`公車預估到站 API 回應錯誤 (${response.status})`);
  }
  return parseBusArrivals(await response.json());
}

/** 建立公車站牌查詢設定。 */
export function createBusQueryOptions(city: string, enabled: boolean) {
  return {
    queryKey: ['traffic', 'bus', city],
    queryFn: ({ signal }: { signal: AbortSignal }) => fetchBusStops(city, signal),
    enabled,
    staleTime: 6 * 60 * 60 * 1000,
  };
}

export function useBusStops(city: string, enabled = true) {
  return useQuery(createBusQueryOptions(city, enabled));
}

/** Popup 開啟期間每 30 秒更新單一站牌到站資訊。 */
export function useBusArrivals(city: string, stopId: string) {
  return useQuery({
    queryKey: ['traffic', 'bus', 'arrivals', city, stopId],
    queryFn: ({ signal }) => fetchBusArrivals(city, stopId, signal),
    enabled: Boolean(city && stopId),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

/** 同時查詢路線經過縣市的公車站牌。 */
export function useBusStopsForCities(cities: string[], enabled = true) {
  return useQueries({
    queries: cities.map((city) => createBusQueryOptions(city, enabled)),
    combine: combineBusQueries,
  });
}

/** 驗證後端公車路線行駛路徑回應契約。 */
export function parseBusRouteShape(input: unknown) {
  return busRouteShapeResponseSchema.parse(input);
}

/** 查詢單一路線＋方向的行駛路徑，用 $filter 只查這一條，不下載全縣市 Shape。 */
export async function fetchBusRouteShape(
  city: string,
  routeId: string,
  direction: number,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({
    city,
    route_id: routeId,
    direction: String(direction),
  });
  const response = await fetch(`${apiBaseUrl}/traffic/bus/route-shape?${params}`, {
    signal,
  });
  if (!response.ok) {
    throw new Error(`公車路線路徑 API 回應錯誤 (${response.status})`);
  }
  return parseBusRouteShape(await response.json());
}

/** 點選時刻表路線時查詢該路線的行駛路徑，供繪製在地圖上。 */
export function useBusRouteShape() {
  return useMutation({
    mutationFn: ({
      city,
      routeId,
      direction,
    }: {
      city: string;
      routeId: string;
      direction: number;
    }) => fetchBusRouteShape(city, routeId, direction),
  });
}
