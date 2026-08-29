import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

const parkingSegmentSchema = z.object({
  segmentId: z.string(),
  name: z.string(),
  description: z.string(),
  positionLon: z.number().nullable().optional(),
  positionLat: z.number().nullable().optional(),
  fareDescription: z.string(),
  totalSpaces: z.number().int().nullable().optional(),
  availableSpaces: z.number().int().nullable().optional(),
  serviceStatus: z.number().int().nullable().optional(),
  updateTime: z.string().nullable().optional(),
});

const parkingSegmentsResponseSchema = z.object({
  data: z.object({
    city: z.string(),
    segments: z.array(parkingSegmentSchema),
  }),
});

const parkingSegmentResponseSchema = z.object({ data: parkingSegmentSchema });

export type ParkingSegment = z.infer<typeof parkingSegmentSchema>;

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');

/** 驗證後端路邊停車格回應契約。 */
export function parseParkingSegments(input: unknown) {
  return parkingSegmentsResponseSchema.parse(input);
}

/** 取得後端合併後（靜態路段＋即時可用車位）的路邊停車格。 */
export async function fetchParkingSegments(city: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ city });
  const response = await fetch(`${apiBaseUrl}/traffic/parking/segments?${params}`, { signal });
  if (!response.ok) throw new Error(`路邊停車格 API 回應錯誤 (${response.status})`);
  return parseParkingSegments(await response.json());
}

/** 建立路邊停車格查詢設定，圖層關閉時不消耗 API 額度。 */
export function createParkingSegmentQueryOptions(city: string, enabled: boolean) {
  return {
    queryKey: ['traffic', 'parkingSegments', city],
    queryFn: ({ signal }: { signal: AbortSignal }) => fetchParkingSegments(city, signal),
    enabled,
    staleTime: 60_000,
    refetchInterval: enabled ? (60_000 as const) : (false as const),
  };
}

/** 提供具快取與取消請求能力的路邊停車格查詢。 */
export function useParkingSegments(city: string, enabled = true) {
  return useQuery(createParkingSegmentQueryOptions(city, enabled));
}

/** 驗證後端單一路邊停車格回應契約。 */
export function parseParkingSegment(input: unknown) {
  return parkingSegmentResponseSchema.parse(input);
}

/** 用 OData $filter 只刷新單一路段的即時可用車位，不影響整批快取。 */
export async function fetchParkingSegment(city: string, segmentId: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ city });
  const response = await fetch(
    `${apiBaseUrl}/traffic/parking/segments/${encodeURIComponent(segmentId)}?${params}`,
    { signal },
  );
  if (!response.ok) throw new Error(`路邊停車格路段 API 回應錯誤 (${response.status})`);
  return parseParkingSegment(await response.json());
}

/** 手動刷新單一路邊停車格路段，並就地更新整批查詢的快取（不觸發其他路段重新整理）。 */
export function useReloadParkingSegment(city: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (segmentId: string) => fetchParkingSegment(city, segmentId),
    onSuccess: (result) => {
      const queryKey = ['traffic', 'parkingSegments', city];
      queryClient.setQueryData(queryKey, (current: ReturnType<typeof parseParkingSegments> | undefined) => {
        if (!current) return current;
        return {
          data: {
            ...current.data,
            segments: current.data.segments.map((segment) =>
              segment.segmentId === result.data.segmentId ? result.data : segment,
            ),
          },
        };
      });
    },
  });
}
