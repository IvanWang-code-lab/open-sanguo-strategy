import type { GameState } from "../types";
import { GAME_VERSION } from "../constants/version";
import { ensureCommandState } from "./commandSystem";
import { ensureStrategyObjectives } from "./strategyObjectiveSystem";
import { ensureWorldEvents } from "./worldEventSystem";
import { ensureLiuBeiProtection } from "./liubeiBalanceSystem";
import { ensureLivingWorldState } from "./livingWorldSystem";
import { deriveLegacyCityGenerals } from "../selectors/generalSelectors";

const SAVE_KEY = "three-kingdoms-new-overlord-save-v1";

/** 迁移旧存档的城市武将镜像，并以 locationCityId 建立唯一位置真相源。 */
export const normalizeGeneralLocations = (state: GameState): GameState => {
  const cityIds = new Set(state.cities.map((city) => city.id));
  const legacyLocations = new Map<string, string[]>();
  for (const city of state.cities) {
    for (const generalId of Array.isArray(city.generals) ? city.generals : []) {
      legacyLocations.set(generalId, [...(legacyLocations.get(generalId) ?? []), city.id]);
    }
  }
  const warnings: string[] = [];
  const generals = state.generals.map((general) => {
    const currentLocation = cityIds.has(general.locationCityId) ? general.locationCityId : "";
    const legacy = (legacyLocations.get(general.id) ?? []).filter((cityId, index, values) => cityIds.has(cityId) && values.indexOf(cityId) === index);
    if (legacy.length > 1) warnings.push(`存档迁移：${general.name}曾同时出现在多个城市，已按权威位置去重。`);
    if (currentLocation) return general;
    if (general.status === "active" && legacy[0]) return { ...general, locationCityId: legacy[0] };
    if (general.status === "active") warnings.push(`存档迁移：${general.name}缺少合法驻地，暂不分配城市。`);
    return { ...general, locationCityId: general.status === "active" ? "" : currentLocation };
  });
  const normalized: GameState = {
    ...state,
    generals,
    transfers: state.transfers ?? [],
    history: state.history ?? [],
    logs: [...warnings, ...(state.logs ?? [])].slice(0, 30),
  };
  return deriveLegacyCityGenerals(normalized);
};

export const normalizeGameState = (state: GameState): GameState =>
  normalizeGeneralLocations(
    ensureLivingWorldState(
      ensureLiuBeiProtection(
        ensureStrategyObjectives(
          ensureWorldEvents(
            ensureCommandState({ ...state, version: GAME_VERSION }),
          ),
        ),
      ),
    ),
  );

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
    return normalizeGameState(parsed);
  } catch {
    localStorage.removeItem(SAVE_KEY);
    return null;
  }
};

// 保存完整游戏状态。
export const saveGame = (state: GameState) => {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(normalizeGameState(state)));
  } catch (error) {
    console.warn("存档失败，请检查浏览器 localStorage 是否可用。", error);
  }
};

// 清空本项目存档。
export const clearSave = () => {
  localStorage.removeItem(SAVE_KEY);
};
