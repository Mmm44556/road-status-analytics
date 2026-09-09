import { z } from 'zod';

const coordinateSchema = z.tuple([z.number().finite(), z.number().finite()]);
const routeTravelModeSchema = z.enum(['drive', 'transit', 'bicycle', 'walk']);
const routeResponseSchema = z.object({
  data: z.object({
    distance_meters: z.number().nonnegative().finite(),
    duration_seconds: z.number().nonnegative().finite(),
    geometry: z.object({
      type: z.literal('MultiLineString'),
      coordinates: z.array(z.array(coordinateSchema)).min(1),
    }),
    travel_mode: routeTravelModeSchema,
    is_approximated: z.boolean().default(false),
    source: z.string(),
  }),
});

export type RouteCoordinate = {
  longitude: number;
  latitude: number;
};

export type RouteTravelMode = z.infer<typeof routeTravelModeSchema>;

export type RouteResult = {
  distanceMeters: number;
  durationSeconds: number;
  geometry: {
    type: 'MultiLineString';
    coordinates: [number, number][][];
  };
  travelMode: RouteTravelMode;
  isApproximated: boolean;
  source: string;
};

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');

/** 透過後端代理計算路線，避免將 Geoapify API Key 暴露至瀏覽器。 */
export async function calculateRoute(
  waypoints: RouteCoordinate[],
  travelMode: RouteTravelMode = 'drive',
  fetcher: typeof fetch = fetch,
): Promise<RouteResult> {
  const response = await fetcher(`${apiBaseUrl}/routes`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ waypoints, travel_mode: travelMode }),
  });
  if (!response.ok) throw new Error('路線規劃服務暫時無法使用。');
  const { data } = routeResponseSchema.parse(await response.json());
  return {
    distanceMeters: data.distance_meters,
    durationSeconds: data.duration_seconds,
    geometry: data.geometry,
    travelMode: data.travel_mode,
    isApproximated: data.is_approximated,
    source: data.source,
  };
}
