import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

const nextTrainSchema = z.object({
  direction: z.string(),
  estimateMinutes: z.number(),
});

const metroStationSchema = z.object({
  stationId: z.string(),
  name: z.string(),
  system: z.string(),
  positionLon: z.number().nullable().optional(),
  positionLat: z.number().nullable().optional(),
  nextTrains: z.array(nextTrainSchema),
  updateTime: z.string().nullable().optional(),
});

const metroResponseSchema = z.object({
  data: z.object({
    city: z.string(),
    stations: z.array(metroStationSchema),
  }),
});
type MetroResponse = z.infer<typeof metroResponseSchema>;

const combineMetroQueries = (
  results: Array<{
    data?: MetroResponse;
    isError: boolean;
    isFetching: boolean;
  }>,
) => ({
  responses: results.flatMap((result) => (result.data ? [result.data] : [])),
  isError: results.some((result) => result.isError),
  isFetching: results.some((result) => result.isFetching),
});

const metroStationResponseSchema = z.object({ data: metroStationSchema });

export type MetroStation = z.infer<typeof metroStationSchema>;
export type MetroNextTrain = z.infer<typeof nextTrainSchema>;

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');

/** 驗證後端捷運／輕軌站點回應契約。 */
export function parseMetroStations(input: unknown) {
  return metroResponseSchema.parse(input);
}

/** 取得後端合併後（靜態站點＋即時到站預估）的捷運／輕軌站點。 */
export async function fetchMetroStations(city: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ city });
  const response = await fetch(`${apiBaseUrl}/traffic/metro?${params}`, { signal });
  if (!response.ok) throw new Error(`捷運／輕軌 API 回應錯誤 (${response.status})`);
  return parseMetroStations(await response.json());
}

/** 建立捷運／輕軌查詢設定，圖層關閉時不消耗 API 額度。 */
export function createMetroQueryOptions(city: string, enabled: boolean) {
  return {
    queryKey: ['traffic', 'metro', city],
    queryFn: ({ signal }: { signal: AbortSignal }) => fetchMetroStations(city, signal),
    enabled,
    staleTime: 60_000,
    refetchInterval: enabled ? (60_000 as const) : (false as const),
  };
}

/** 提供具快取與取消請求能力的捷運／輕軌查詢。 */
export function useMetroStations(city: string, enabled = true) {
  return useQuery(createMetroQueryOptions(city, enabled));
}

/** 同時查詢路線經過縣市的捷運與輕軌站點。 */
export function useMetroStationsForCities(cities: string[], enabled = true) {
  return useQueries({
    queries: cities.map((city) => createMetroQueryOptions(city, enabled)),
    combine: combineMetroQueries,
  });
}

/** 驗證後端單一捷運／輕軌站點回應契約。 */
export function parseMetroStation(input: unknown) {
  return metroStationResponseSchema.parse(input);
}

/** 用 OData $filter 只刷新單一站點的即時到站資料，不影響整批快取。 */
export async function fetchMetroStation(city: string, stationId: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ city });
  const response = await fetch(
    `${apiBaseUrl}/traffic/metro/${encodeURIComponent(stationId)}?${params}`,
    { signal },
  );
  if (!response.ok) throw new Error(`捷運／輕軌站點 API 回應錯誤 (${response.status})`);
  return parseMetroStation(await response.json());
}

/** 手動刷新單一捷運／輕軌站點，並就地更新整批查詢的快取（不觸發其他站點重新整理）。 */
export function useReloadMetroStation(city: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stationId: string) => fetchMetroStation(city, stationId),
    onSuccess: (result) => {
      const queryKey = ['traffic', 'metro', city];
      queryClient.setQueryData(queryKey, (current: ReturnType<typeof parseMetroStations> | undefined) => {
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
