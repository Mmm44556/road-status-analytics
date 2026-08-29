import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

const parkingLotSchema = z.object({
  lotId: z.string(),
  name: z.string(),
  address: z.string(),
  positionLon: z.number().nullable().optional(),
  positionLat: z.number().nullable().optional(),
  fareDescription: z.string(),
  isMotorcycle: z.boolean(),
  totalSpaces: z.number().int().nullable().optional(),
  availableSpaces: z.number().int().nullable().optional(),
  serviceStatus: z.number().int().nullable().optional(),
  updateTime: z.string().nullable().optional(),
});

const parkingLotsResponseSchema = z.object({
  data: z.object({
    city: z.string(),
    lots: z.array(parkingLotSchema),
  }),
});

const parkingLotResponseSchema = z.object({ data: parkingLotSchema });

export type ParkingLot = z.infer<typeof parkingLotSchema>;

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');

/** 驗證後端戶外停車場回應契約。 */
export function parseParkingLots(input: unknown) {
  return parkingLotsResponseSchema.parse(input);
}

/** 取得後端合併後（靜態站點＋即時可用車位）的戶外停車場。 */
export async function fetchParkingLots(city: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ city });
  const response = await fetch(`${apiBaseUrl}/traffic/parking/lots?${params}`, { signal });
  if (!response.ok) throw new Error(`戶外停車場 API 回應錯誤 (${response.status})`);
  return parseParkingLots(await response.json());
}

/** 建立戶外停車場查詢設定，圖層關閉時不消耗 API 額度。 */
export function createParkingLotQueryOptions(city: string, enabled: boolean) {
  return {
    queryKey: ['traffic', 'parkingLots', city],
    queryFn: ({ signal }: { signal: AbortSignal }) => fetchParkingLots(city, signal),
    enabled,
    staleTime: 60_000,
    refetchInterval: enabled ? (60_000 as const) : (false as const),
  };
}

/** 提供具快取與取消請求能力的戶外停車場查詢。 */
export function useParkingLots(city: string, enabled = true) {
  return useQuery(createParkingLotQueryOptions(city, enabled));
}

/** 驗證後端單一戶外停車場回應契約。 */
export function parseParkingLot(input: unknown) {
  return parkingLotResponseSchema.parse(input);
}

/** 用 OData $filter 只刷新單一停車場的即時可用車位，不影響整批快取。 */
export async function fetchParkingLot(city: string, lotId: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ city });
  const response = await fetch(
    `${apiBaseUrl}/traffic/parking/lots/${encodeURIComponent(lotId)}?${params}`,
    { signal },
  );
  if (!response.ok) throw new Error(`戶外停車場站點 API 回應錯誤 (${response.status})`);
  return parseParkingLot(await response.json());
}

/** 手動刷新單一戶外停車場，並就地更新整批查詢的快取（不觸發其他停車場重新整理）。 */
export function useReloadParkingLot(city: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lotId: string) => fetchParkingLot(city, lotId),
    onSuccess: (result) => {
      const queryKey = ['traffic', 'parkingLots', city];
      queryClient.setQueryData(queryKey, (current: ReturnType<typeof parseParkingLots> | undefined) => {
        if (!current) return current;
        return {
          data: {
            ...current.data,
            lots: current.data.lots.map((lot) =>
              lot.lotId === result.data.lotId ? result.data : lot,
            ),
          },
        };
      });
    },
  });
}
