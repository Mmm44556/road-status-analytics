import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

const cctvSchema = z.object({
  CCTVID: z.string(),
  LinkID: z.string(),
  VideoStreamURL: z.string().url(),
  LocationType: z.number(),
  PositionLon: z.number(),
  PositionLat: z.number(),
  // 少數攝影機（例如未對應到路段的機台）完全沒有這幾個欄位，須視為選填。
  RoadID: z.string().optional(),
  RoadName: z.string().optional(),
  RoadClass: z.number().optional(),
  RoadDirection: z.string().optional(),
  SurveillanceType: z.number().optional(),
  SurveillanceDescription: z.string().optional(),
  RoadSection: z.object({ Start: z.string(), End: z.string() }).optional(),
  LocationMile: z.string().optional(),
  LayoutMapURL: z.string().optional(),
});

const cctvsSchema = z.object({
  data: z.object({
    city: z.string(),
    cctvs: z.array(cctvSchema),
  }),
});

export type Cctv = z.infer<typeof cctvSchema>;

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(
  /\/$/,
  '',
);

/** 驗證後端 CCTV 回應是否符合前端契約。 */
export function parseCctvCameras(input: unknown) {
  // 外部資料進入地圖前必須通過契約驗證。
  return cctvsSchema.parse(input);
}

/** 從後端取得指定縣市的 TDX CCTV 點位。 */
export async function fetchCctvCameras(city: string, signal?: AbortSignal) {
  // 單一縣市的 CCTV 總數常超過 300 支（如臺北市約 384 支），top 需設高一點避免截斷。
  const params = new URLSearchParams({ city, top: '1000' });
  const response = await fetch(`${apiBaseUrl}/traffic/cctv?${params}`, {
    signal,
  });
  if (!response.ok) {
    throw new Error(`CCTV API 回應錯誤 (${response.status})`);
  }
  return parseCctvCameras(await response.json());
}

/** 產生透過本專案後端讀取的 CCTV 影像網址。 */
export function getCctvImageUrl(city: string, cameraId: string) {
  const params = new URLSearchParams({ city, camera_id: cameraId });
  return `${apiBaseUrl}/traffic/cctv/image?${params}`;
}

/** 建立 CCTV 查詢設定，圖層關閉時不消耗 API 額度。 */
export function createCctvQueryOptions(city: string, enabled: boolean) {
  return {
    queryKey: ['traffic', 'cctv', city],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      fetchCctvCameras(city, signal),
    staleTime: 5 * 60 * 1000,
    enabled,
  };
}

/** 提供具快取與取消請求能力的 CCTV 查詢。 */
export function useCctvCameras(city: string, enabled = true) {
  return useQuery(createCctvQueryOptions(city, enabled));
}
