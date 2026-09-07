import { useQueries, useQuery } from '@tanstack/react-query';
import { z } from 'zod';

const roadEventBaseSchema = z.object({
  EventID: z.string(),
  EventTitle: z.string(),
  Description: z.string(),
  EventType: z.number(),
  EventSubType: z.number(),
  EventStep: z.number(),
  EffectiveTime: z.string(),
  Positions: z.string(),
  LocationType: z.number(),
  Location: z.object({ Other: z.string() }),
  Source: z.string(),
  PublishTime: z.string(),
  LastUpdateTime: z.string(),
});

const previewRoadEventSchema = roadEventBaseSchema.extend({
  ExpireTime: z.string(),
  Geometry: z.string(),
});

const roadEventsSchema = z.object({
  data: z.object({
    city: z.string(),
    preview: z.object({ Events: z.array(previewRoadEventSchema) }),
    live: z.object({ LiveEvents: z.array(roadEventBaseSchema) }),
  }),
});
type RoadEventsResponse = z.infer<typeof roadEventsSchema>;

const combineRoadEventQueries = (
  results: Array<{
    data?: RoadEventsResponse;
    isError: boolean;
    isFetching: boolean;
  }>,
) => ({
  responses: results.flatMap((result) => (result.data ? [result.data] : [])),
  isError: results.some((result) => result.isError),
  isFetching: results.some((result) => result.isFetching),
});

export type PreviewRoadEvent = z.infer<typeof previewRoadEventSchema>;
export type LiveRoadEvent = z.infer<typeof roadEventBaseSchema>;

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(
  /\/$/,
  '',
);

/** 驗證後端道路事件回應是否符合前端契約。 */
export function parseRoadEvents(input: unknown) {
  // 外部資料進入地圖前必須通過契約驗證。
  return roadEventsSchema.parse(input);
}

/** 從後端取得指定縣市的 TDX 道路事件。 */
export async function fetchRoadEvents(city: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ city, top: '200' });
  const response = await fetch(`${apiBaseUrl}/traffic/road-events?${params}`, {
    signal,
  });
  if (!response.ok) {
    throw new Error(`道路事件 API 回應錯誤 (${response.status})`);
  }
  return parseRoadEvents(await response.json());
}

/** 建立道路事件查詢設定，圖層關閉或尚未選定行政區時不消耗 API 額度。 */
export function createRoadEventQueryOptions(city: string, enabled: boolean) {
  return {
    queryKey: ['traffic', 'road-events', city],
    queryFn: ({ signal }: { signal: AbortSignal }) => fetchRoadEvents(city, signal),
    enabled,
    staleTime: 2 * 60 * 1000,
  };
}

/** 提供具快取與取消請求能力的道路事件查詢。 */
export function useRoadEvents(city: string, enabled = true) {
  return useQuery(createRoadEventQueryOptions(city, enabled));
}

/** 同時查詢路線經過的多個縣市。 */
export function useRoadEventsForCities(cities: string[], enabled = true) {
  return useQueries({
    queries: cities.map((city) => createRoadEventQueryOptions(city, enabled)),
    combine: combineRoadEventQueries,
  });
}
