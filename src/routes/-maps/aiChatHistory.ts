import type { AiChatTurn } from '@/service/aiChatApi';

// 只保留最近幾輪往返送給 Gemini，避免同一次開啟聊天室聊越久，
// 每次呼叫要送的歷史就跟著無限變長（拖慢速度、也拉高 token 用量）。
export const MAX_HISTORY_ENTRIES = 24;

/** 裁掉太舊的對話歷史，只保留最近 MAX_HISTORY_ENTRIES 筆。 */
export function capHistory(history: AiChatTurn[]): AiChatTurn[] {
  if (history.length <= MAX_HISTORY_ENTRIES) return history;
  return history.slice(history.length - MAX_HISTORY_ENTRIES);
}
