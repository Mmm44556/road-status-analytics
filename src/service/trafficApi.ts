import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

const accidentSummaryItemSchema = z.object({
  date: z.string(),
  city: z.string(),
  A1: z.number(),
  A2: z.number(),
  A3: z.number(),
  total: z.number(),
  MM: z.string().regex(/^(0[1-9]|1[0-2])$/),
  YYYY: z.string().regex(/^\d{4}$/),
});

const accidentSummarySchema = z.object({
  data: z.array(z.unknown()),
});

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

export type AccidentSummaryItem = z.infer<typeof accidentSummaryItemSchema>;
export type PreviewRoadEvent = z.infer<typeof previewRoadEventSchema>;
export type LiveRoadEvent = z.infer<typeof roadEventBaseSchema>;

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(
  /\/$/,
  '',
);

export function parseAccidentSummary(input: unknown) {
  const response = accidentSummarySchema.parse(input);
  const data = response.data.flatMap((item) => {
    const parsed = accidentSummaryItemSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
  if (data.length === 0 && response.data.length > 0) {
    throw new Error("事故統計 API 未包含有效的日期資料");
  }
  return { data };
}

export function parseRoadEvents(input: unknown) {
  return roadEventsSchema.parse(input);
}

export async function fetchRoadEvents(city: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ city, top: "100" });
  const response = await fetch(`${apiBaseUrl}/traffic/road-events?${params}`, {
    signal,
  });
  if (!response.ok) {
    throw new Error(`道路事件 API 回應錯誤 (${response.status})`);
  }
  return parseRoadEvents(await response.json());
}

export function useRoadEvents(city: string) {
  return useQuery({
    queryKey: ["traffic", "road-events", city],
    queryFn: ({ signal }) => fetchRoadEvents(city, signal),
    staleTime: 2 * 60 * 1000,
  });
}

export async function fetchAccidentSummary(signal?: AbortSignal) {
  const response = await fetch(`${apiBaseUrl}/traffic/events/summary`, {
    signal,
  });
  if (!response.ok) {
    throw new Error(`事故統計 API 回應錯誤 (${response.status})`);
  }
  return parseAccidentSummary(await response.json());
}

export function useAccidentSummary() {
  return useQuery({
    queryKey: ['traffic', 'accident-summary'],
    queryFn: ({ signal }) => fetchAccidentSummary(signal),
    staleTime: 5 * 60 * 1000,
  });
}

export function getTopCities(
  items: AccidentSummaryItem[],
  year: string,
  month: string,
  limit: number,
) {
  const cityTotals = new Map<string, number>();
  for (const item of items) {
    if (item.YYYY === year && item.MM === month && item.city) {
      cityTotals.set(item.city, (cityTotals.get(item.city) ?? 0) + item.total);
    }
  }

  return [...cityTotals.entries()]
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function getAccidentTypeTotals(
  items: AccidentSummaryItem[],
  year: string,
  month: string,
) {
  return items.reduce(
    (totals, item) => {
      if (item.YYYY === year && item.MM === month) {
        totals.A1 += item.A1;
        totals.A2 += item.A2;
        totals.A3 += item.A3;
      }
      return totals;
    },
    { A1: 0, A2: 0, A3: 0 },
  );
}

export function getLatestPeriod(items: AccidentSummaryItem[]) {
  const latest = items.reduce<string | null>((current, item) => {
    const period = `${item.YYYY}-${item.MM}`;
    return current === null || period > current ? period : current;
  }, null);

  if (!latest) return null;
  const [year, month] = latest.split('-');
  return { year, month };
}
