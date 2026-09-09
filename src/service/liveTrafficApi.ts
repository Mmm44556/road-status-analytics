import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

const liveTrafficSegmentSchema = z.object({
  sectionId: z.string(),
  roadName: z.string(),
  sectionName: z.string(),
  roadDirection: z.string(),
  coordinates: z.array(z.tuple([z.number(), z.number()])).min(2),
  travelSpeed: z.number().nullable().optional(),
  travelTime: z.number().int().nullable().optional(),
  congestionLevel: z.number().int(),
  dataCollectTime: z.string(),
  // VD：市區道路沒有官方壅塞資料，由後端以車輛偵測器車速推估等級。
  source: z.enum(['Highway', 'Freeway', 'VD']),
});

const liveTrafficResponseSchema = z.object({
  data: z.object({
    city: z.string(),
    updatedAt: z.string(),
    segments: z.array(liveTrafficSegmentSchema),
  }),
});

export type LiveTrafficSegment = z.infer<typeof liveTrafficSegmentSchema>;

/** 驗證後端即時路況回應契約。 */
export function parseLiveTraffic(input: unknown) {
  return liveTrafficResponseSchema.parse(input);
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');

/** 取得後端整理後的國道與省道即時路況線段。 */
export async function fetchLiveTraffic(city: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ city });
  const response = await fetch(`${apiBaseUrl}/traffic/live-traffic?${params}`, {
    signal,
  });
  if (!response.ok) throw new Error(`即時路況 API 回應錯誤 (${response.status})`);
  return parseLiveTraffic(await response.json());
}

/** 圖層關閉時停止查詢，開啟後每分鐘更新一次。 */
export function useLiveTraffic(city: string, enabled: boolean) {
  return useQuery({
    queryKey: ['traffic', 'live-traffic', city],
    queryFn: ({ signal }) => fetchLiveTraffic(city, signal),
    enabled,
    staleTime: 60_000,
    refetchInterval: enabled ? 60_000 : false,
  });
}
