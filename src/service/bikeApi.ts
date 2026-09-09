import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

const bikeStationSchema = z.object({
  stationId: z.string(),
  name: z.string(),
  address: z.string(),
  positionLon: z.number(),
  positionLat: z.number(),
  capacity: z.number().nullable().optional(),
  serviceStatus: z.number().int().nullable().optional(),
  availableRentBikes: z.number().int().nullable().optional(),
  availableReturnBikes: z.number().int().nullable().optional(),
  availableElectricBikes: z.number().int().nullable().optional(),
  updateTime: z.string().nullable().optional(),
});

const bikesResponseSchema = z.object({
  data: z.object({
    city: z.string(),
    stations: z.array(bikeStationSchema),
  }),
});
type BikesResponse = z.infer<typeof bikesResponseSchema>;

const combineBikeQueries = (
  results: Array<{
    data?: BikesResponse;
    isError: boolean;
    isFetching: boolean;
  }>,
) => ({
  responses: results.flatMap((result) => (result.data ? [result.data] : [])),
  isError: results.some((result) => result.isError),
  isFetching: results.some((result) => result.isFetching),
});

const bikeStationResponseSchema = z.object({ data: bikeStationSchema });

export type BikeStation = z.infer<typeof bikeStationSchema>;

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');

/** 驗證後端 YouBike 站點回應契約。 */
export function parseBikeStations(input: unknown) {
  return bikesResponseSchema.parse(input);
}

/** 取得後端合併後（靜態站點＋即時可借還數量）的 YouBike 站點。 */
export async function fetchBikeStations(city: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ city });
  const response = await fetch(`${apiBaseUrl}/traffic/bike?${params}`, { signal });
  if (!response.ok) throw new Error(`YouBike API 回應錯誤 (${response.status})`);
  return parseBikeStations(await response.json());
}

/** 建立 YouBike 查詢設定，圖層關閉時不消耗 API 額度。 */
export function createBikeQueryOptions(city: string, enabled: boolean) {
  return {
    queryKey: ['traffic', 'bike', city],
    queryFn: ({ signal }: { signal: AbortSignal }) => fetchBikeStations(city, signal),
    enabled,
    staleTime: 60_000,
    refetchInterval: enabled ? (60_000 as const) : (false as const),
  };
}

/** 提供具快取與取消請求能力的 YouBike 查詢。 */
export function useBikeStations(city: string, enabled = true) {
  return useQuery(createBikeQueryOptions(city, enabled));
}

/** 同時查詢路線經過縣市的 YouBike 站點。 */
export function useBikeStationsForCities(cities: string[], enabled = true) {
  return useQueries({
    queries: cities.map((city) => createBikeQueryOptions(city, enabled)),
    combine: combineBikeQueries,
  });
}

/** 驗證後端單一 YouBike 站點回應契約。 */
export function parseBikeStation(input: unknown) {
  return bikeStationResponseSchema.parse(input);
}

/** 用 OData $filter 只刷新單一站點的即時資料，不影響整批快取。 */
export async function fetchBikeStation(city: string, stationId: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ city });
  const response = await fetch(
    `${apiBaseUrl}/traffic/bike/${encodeURIComponent(stationId)}?${params}`,
    { signal },
  );
  if (!response.ok) throw new Error(`YouBike 站點 API 回應錯誤 (${response.status})`);
  return parseBikeStation(await response.json());
}

/** 手動刷新單一 YouBike 站點，並就地更新整批查詢的快取（不觸發其他站點重新整理）。 */
export function useReloadBikeStation(city: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stationId: string) => fetchBikeStation(city, stationId),
    onSuccess: (result) => {
      const queryKey = ['traffic', 'bike', city];
      queryClient.setQueryData(queryKey, (current: ReturnType<typeof parseBikeStations> | undefined) => {
        if (!current) return current;
        return {
          data: {
            ...current.data,
            stations: current.data.stations.map((station) =>
              station.stationId === result.data.stationId ? result.data : station,
            ),
          },
        };
      });
    },
  });
}
