import { z } from 'zod';

const placeSearchResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  longitude: z.number().finite(),
  latitude: z.number().finite(),
  type: z.string(),
  source: z.string(),
});

const placeSearchResponseSchema = z.object({
  data: z.array(placeSearchResultSchema),
});

export type PlaceSearchResult = z.infer<typeof placeSearchResultSchema>;

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');

/** 透過後端查詢地點，避免前端直接耦合特定供應商。 */
export async function searchPlaces(
  query: string,
  city: string | null,
  fetcher: typeof fetch = fetch,
): Promise<PlaceSearchResult[]> {
  const params = new URLSearchParams({ q: query, limit: '5' });
  if (city) params.set('city', city);
  const response = await fetcher(
    `${apiBaseUrl}/places/search?${params.toString()}`,
    {
      headers: { Accept: 'application/json' },
    },
  );
  if (!response.ok) throw new Error('地點搜尋服務暫時無法使用。');
  return placeSearchResponseSchema.parse(await response.json()).data;
}
