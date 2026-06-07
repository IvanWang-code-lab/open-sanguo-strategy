import type { GameState } from "../types";
import { GAME_VERSION } from "../constants/version";
import { ensureCommandState } from "./commandSystem";

const SAVE_KEY = "three-kingdoms-new-overlord-save-v1";

const isValidGameState = (value: unknown): value is GameState => {
  const state = value as Partial<GameState> | null;
  return Boolean(
    state &&
      typeof state.version === "string" &&
      typeof state.playerFactionId === "string" &&
      typeof state.year === "number" &&
      typeof state.month === "number" &&
      typeof state.currentWeather === "string" &&
      Array.isArray(state.factions) &&
      Array.isArray(state.cities) &&
      Array.isArray(state.generals) &&
      Array.isArray(state.logs),
  );
};

// 读取本地存档，格式异常时返回空值。
export const loadGame = (): GameState | null => {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidGameState(parsed)) {
      localStorage.removeItem(SAVE_KEY);
      return null;
    }
    return ensureCommandState({ ...parsed, version: GAME_VERSION });
  } catch {
    localStorage.removeItem(SAVE_KEY);
    return null;
  }
};

// 保存完整游戏状态。
export const saveGame = (state: GameState) => {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(ensureCommandState({ ...state, version: GAME_VERSION })));
  } catch (error) {
    console.warn("存档失败，请检查浏览器 localStorage 是否可用。", error);
  }
};

// 清空本项目存档。
export const clearSave = () => {
  localStorage.removeItem(SAVE_KEY);
};
