import { z } from 'zod';
import {
  trafficLayerCatalog,
  type TrafficLayerId,
} from '@/data/trafficLayerCatalog';
import { basemapCatalog, type BasemapId } from '@/data/basemapCatalog';

const layerIdSchema = z.enum(
  trafficLayerCatalog.map((layer) => layer.id) as [
    TrafficLayerId,
    ...TrafficLayerId[],
  ],
);

const basemapIdSchema = z.enum(
  basemapCatalog.map((basemap) => basemap.id) as [BasemapId, ...BasemapId[]],
);

const searchPlaceActionSchema = z.object({
  type: z.literal('search_place'),
  query: z.string(),
});

const planRouteActionSchema = z.object({
  type: z.literal('plan_route'),
  origin: z.string(),
  destination: z.string(),
  stopovers: z.array(z.string()).default([]),
  travelMode: z.enum(['drive', 'transit', 'bicycle', 'walk']),
});

const toggleLayerActionSchema = z.object({
  type: z.literal('toggle_layer'),
  layerId: layerIdSchema,
  visible: z.boolean(),
});

const selectAreaActionSchema = z.object({
  type: z.literal('select_area'),
  countyName: z.string(),
  townshipName: z.string().nullable().optional(),
});

const clearRouteActionSchema = z.object({
  type: z.literal('clear_route'),
});

const locateMeActionSchema = z.object({
  type: z.literal('locate_me'),
});

const resetAreaActionSchema = z.object({
  type: z.literal('reset_area'),
});

const changeBasemapActionSchema = z.object({
  type: z.literal('change_basemap'),
  basemapId: basemapIdSchema,
});

const aiMapActionSchema = z.discriminatedUnion('type', [
  searchPlaceActionSchema,
  planRouteActionSchema,
  toggleLayerActionSchema,
  selectAreaActionSchema,
  clearRouteActionSchema,
  locateMeActionSchema,
  resetAreaActionSchema,
  changeBasemapActionSchema,
]);

export type AiMapAction = z.infer<typeof aiMapActionSchema>;

export type AiChatTurn = { role: 'user' | 'model'; content: string };

export type AiActionResult = { type: string; success: boolean; summary: string };

const aiChatStreamEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('delta'), text: z.string() }),
  z.object({ type: z.literal('done'), actions: z.array(aiMapActionSchema).default([]) }),
  z.object({ type: z.literal('error'), detail: z.string() }),
]);

export type AiChatStreamEvent = Extract<
  z.infer<typeof aiChatStreamEventSchema>,
  { type: 'delta' | 'done' }
>;

/** 驗證從 SSE 事件解析出的單筆 JSON payload。 */
export function parseAiChatStreamEvent(input: unknown) {
  return aiChatStreamEventSchema.parse(input);
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');

/**
 * 以 SSE 串流呼叫 /ai/chat：文字一段一段透過 onEvent 送出，結束時附上結構化動作。
 * 收到後端的 error 事件時會直接讓這個 Promise reject，onEvent 只會收到 delta／done。
 */
export async function streamAiChat(
  body: {
    history: AiChatTurn[];
    message?: string;
    actionResults?: AiActionResult[];
  },
  onEvent: (event: AiChatStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/ai/chat`, {
    method: 'POST',
    headers: { Accept: 'text/event-stream', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok || !response.body) {
    throw new Error(`AI 聊天 API 回應錯誤 (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const rawEvents = buffer.split('\n\n');
    buffer = rawEvents.pop() ?? '';
    for (const rawEvent of rawEvents) {
      const line = rawEvent.trim();
      if (!line.startsWith('data:')) continue;
      const jsonText = line.slice('data:'.length).trim();
      if (!jsonText) continue;
      const event = parseAiChatStreamEvent(JSON.parse(jsonText));
      if (event.type === 'error') throw new Error(event.detail);
      onEvent(event);
    }
  }
}
