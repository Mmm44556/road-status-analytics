import { describe, expect, it } from 'vitest';
import { capHistory, MAX_HISTORY_ENTRIES } from '@/routes/-maps/aiChatHistory';
import type { AiChatTurn } from '@/service/aiChatApi';

function turn(index: number): AiChatTurn {
  return { role: index % 2 === 0 ? 'user' : 'model', content: `turn-${index}` };
}

describe('capHistory', () => {
  it('leaves a short history untouched', () => {
    const history = [turn(0), turn(1), turn(2)];

    expect(capHistory(history)).toBe(history);
  });

  it('leaves a history exactly at the limit untouched', () => {
    const history = Array.from({ length: MAX_HISTORY_ENTRIES }, (_, i) => turn(i));

    expect(capHistory(history)).toBe(history);
  });

  it('trims a history over the limit down to the most recent entries', () => {
    const history = Array.from(
      { length: MAX_HISTORY_ENTRIES + 5 },
      (_, i) => turn(i),
    );

    const result = capHistory(history);

    expect(result).toHaveLength(MAX_HISTORY_ENTRIES);
    expect(result[0]).toEqual(turn(5));
    expect(result[result.length - 1]).toEqual(turn(MAX_HISTORY_ENTRIES + 4));
  });
});
