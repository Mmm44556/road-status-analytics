import { describe, expect, it } from 'vitest';
import { parseAiChatStreamEvent } from '@/service/aiChatApi';

describe('AI 聊天串流事件 contract', () => {
  it('accepts a delta event', () => {
    const parsed = parseAiChatStreamEvent({ type: 'delta', text: '你好' });
    expect(parsed).toEqual({ type: 'delta', text: '你好' });
  });

  it('accepts a done event with no actions', () => {
    const parsed = parseAiChatStreamEvent({ type: 'done' });
    expect(parsed).toEqual({ type: 'done', actions: [] });
  });

  it('accepts an error event', () => {
    const parsed = parseAiChatStreamEvent({ type: 'error', detail: '服務失敗' });
    expect(parsed).toEqual({ type: 'error', detail: '服務失敗' });
  });

  it('accepts a done event with a search_place action', () => {
    const parsed = parseAiChatStreamEvent({
      type: 'done',
      actions: [{ type: 'search_place', query: '台北車站' }],
    });
    expect(parsed).toMatchObject({
      actions: [{ type: 'search_place', query: '台北車站' }],
    });
  });

  it('accepts a plan_route action with default stopovers', () => {
    const parsed = parseAiChatStreamEvent({
      type: 'done',
      actions: [
        {
          type: 'plan_route',
          origin: '高雄車站',
          destination: '義大世界',
          travelMode: 'drive',
        },
      ],
    });
    expect(parsed).toMatchObject({
      actions: [{ type: 'plan_route', stopovers: [], travelMode: 'drive' }],
    });
  });

  it('accepts a toggle_layer action for a known layer id', () => {
    const parsed = parseAiChatStreamEvent({
      type: 'done',
      actions: [{ type: 'toggle_layer', layerId: 'cctv', visible: true }],
    });
    expect(parsed).toMatchObject({
      actions: [{ type: 'toggle_layer', layerId: 'cctv', visible: true }],
    });
  });

  it('rejects a toggle_layer action with an unknown layer id', () => {
    expect(() =>
      parseAiChatStreamEvent({
        type: 'done',
        actions: [{ type: 'toggle_layer', layerId: 'not-a-layer', visible: true }],
      }),
    ).toThrow();
  });

  it('accepts a select_area action without a township', () => {
    const parsed = parseAiChatStreamEvent({
      type: 'done',
      actions: [{ type: 'select_area', countyName: '高雄市' }],
    });
    expect(parsed).toMatchObject({
      actions: [{ countyName: '高雄市' }],
    });
  });

  it('accepts a clear_route action', () => {
    const parsed = parseAiChatStreamEvent({
      type: 'done',
      actions: [{ type: 'clear_route' }],
    });
    expect(parsed).toMatchObject({ actions: [{ type: 'clear_route' }] });
  });

  it('accepts a locate_me action', () => {
    const parsed = parseAiChatStreamEvent({
      type: 'done',
      actions: [{ type: 'locate_me' }],
    });
    expect(parsed).toMatchObject({ actions: [{ type: 'locate_me' }] });
  });

  it('rejects an unknown action type', () => {
    expect(() =>
      parseAiChatStreamEvent({
        type: 'done',
        actions: [{ type: 'delete_everything' }],
      }),
    ).toThrow();
  });

  it('rejects an unknown event type', () => {
    expect(() => parseAiChatStreamEvent({ type: 'ping' })).toThrow();
  });
});
