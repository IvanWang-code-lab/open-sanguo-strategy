import type { GameState } from "../types";

// 统一追加事件日志，只保留最近 30 条。
export const addLog = (state: GameState, message: string): GameState => ({
  ...state,
  logs: [`${state.year}年${state.month}月：${message}`, ...state.logs].slice(0, 30),
});

export const addLogs = (state: GameState, messages: string[]): GameState =>
  messages.reduce((next, message) => addLog(next, message), state);
