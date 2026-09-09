import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { z } from 'zod';

const vdLinkSchema = z.object({
  linkId: z.string(),
  roadDirection: z.string(),
  laneCount: z.number().nullable().optional(),
  averageSpeed: z.number().nullable().optional(),
  averageOccupancy: z.number().nullable().optional(),
  // 沒有有效車速讀數時為 null；重用即時路況圖層同一套車速門檻換算。
  congestionLevel: z.number().int().nullable().optional(),
});

const vdSchema = z.object({
  vdId: z.string(),
  positionLon: z.number(),
  positionLat: z.number(),
  roadName: z.string(),
  roadSection: z.object({ start: z.string(), end: z.string() }),
  links: z.array(vdLinkSchema),
});

const vdsResponseSchema = z.object({
  data: z.object({
    city: z.string(),
    vds: z.array(vdSchema),
  }),
});
type VdsResponse = z.infer<typeof vdsResponseSchema>;

const combineVdQueries = (
  results: Array<{
    data?: VdsResponse;
    isError: boolean;
    isFetching: boolean;
  }>,
) => ({
  responses: results.flatMap((result) => (result.data ? [result.data] : [])),
  isError: results.some((result) => result.isError),
  isFetching: results.some((result) => result.isFetching),
});

const vdReadingResponseSchema = z.object({ data: vdSchema });

export type Vd = z.infer<typeof vdSchema>;
export type VdLink = z.infer<typeof vdLinkSchema>;

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');

/** 驗證後端 VD（車輛偵測器）回應契約。 */
export function parseVds(input: unknown) {
  return vdsResponseSchema.parse(input);
}

/** 取得後端合併後（靜態位置＋即時讀數）的 VD 點位。 */
export async function fetchVds(city: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ city });
  const response = await fetch(`${apiBaseUrl}/traffic/vd?${params}`, { signal });
  if (!response.ok) throw new Error(`VD API 回應錯誤 (${response.status})`);
  return parseVds(await response.json());
}

/** 建立 VD 查詢設定，圖層關閉時不消耗 API 額度。 */
export function createVdQueryOptions(city: string, enabled: boolean) {
  return {
    queryKey: ['traffic', 'vd', city],
    queryFn: ({ signal }: { signal: AbortSignal }) => fetchVds(city, signal),
    enabled,
    staleTime: 60_000,
    refetchInterval: enabled ? (60_000 as const) : (false as const),
  };
}

/** 提供具快取與取消請求能力的 VD 查詢。 */
export function useVds(city: string, enabled = true) {
  return useQuery(createVdQueryOptions(city, enabled));
}

/** 同時查詢路線經過的多個縣市。 */
export function useVdsForCities(cities: string[], enabled = true) {
  return useQueries({
    queries: cities.map((city) => createVdQueryOptions(city, enabled)),
    combine: combineVdQueries,
  });
}

/** 驗證後端單一 VD 回應契約。 */
export function parseVdReading(input: unknown) {
  return vdReadingResponseSchema.parse(input);
}

/** 用 OData $filter 只刷新單一 VD 的即時讀數，不影響整批快取。 */
export async function fetchVdReading(city: string, vdId: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ city });
  const response = await fetch(
    `${apiBaseUrl}/traffic/vd/${encodeURIComponent(vdId)}?${params}`,
    { signal },
  );
  if (!response.ok) throw new Error(`VD API 回應錯誤 (${response.status})`);
  return parseVdReading(await response.json());
}

/** 手動刷新單一 VD，並就地更新整批查詢的快取（不觸發其他 VD 重新整理）。 */
export function useReloadVd(city: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vdId: string) => fetchVdReading(city, vdId),
    onSuccess: (result) => {
      const queryKey = ['traffic', 'vd', city];
      queryClient.setQueryData(queryKey, (current: ReturnType<typeof parseVds> | undefined) => {
        if (!current) return current;
        return {
          data: {
            ...current.data,
            vds: current.data.vds.map((vd) =>
              vd.vdId === result.data.vdId ? result.data : vd,
            ),
          },
        };
      });
    },
  });
}
