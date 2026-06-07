import { areAdjacent } from "../data/routes";
import type { GameState, General } from "../types";

// 根据经验处理武将升级，升级时随机提升 1 到 2 项属性。
export const grantGeneralExp = (general: General, amount: number): { general: General; logs: string[] } => {
  let next = { ...general, exp: general.exp + amount };
  const logs: string[] = [];
  while (next.exp >= 100 && next.level < 20) {
    next = { ...next, exp: next.exp - 100, level: next.level + 1 };
    const keys: Array<keyof Pick<General, "force" | "intelligence" | "command" | "politics" | "charm">> = [
      "force",
      "intelligence",
      "command",
      "politics",
      "charm",
    ];
    const upgrades = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < upgrades; i += 1) {
      const key = keys[Math.floor(Math.random() * keys.length)];
      next[key] = Math.min(100, next[key] + 1 + Math.floor(Math.random() * 2));
    }
    logs.push(`${next.name}升至${next.level}级，能力有所提升`);
  }
  return { general: next, logs };
};

export const applyExpToGeneral = (state: GameState, generalId: string, amount: number) => {
  const logs: string[] = [];
  const generals = state.generals.map((general) => {
    if (general.id !== generalId) return general;
    const result = grantGeneralExp(general, amount);
    logs.push(...result.logs);
    return result.general;
  });
  return { state: { ...state, generals }, logs };
};

export const getBestGeneral = (state: GameState, cityId: string, mode: "battle" | "politics" | "search" = "battle") => {
  const city = state.cities.find((item) => item.id === cityId);
  if (!city) return undefined;
  const generals = state.generals.filter((general) => city.generals.includes(general.id) && general.status === "active");
  const score = (general: General) =>
    mode === "battle"
      ? general.force * 0.4 + general.command * 0.5 + general.intelligence * 0.1
      : mode === "politics"
        ? general.politics * 0.7 + general.intelligence * 0.3
        : general.intelligence * 0.55 + general.charm * 0.45;
  return generals.sort((a, b) => score(b) - score(a))[0];
};

// 检查未登场武将是否到期，到期后转为在野并可被搜索。
export const checkGeneralAppearances = (state: GameState) => {
  const logs: string[] = [];
  const generals = state.generals.map((general) => {
    if (
      general.status === "locked" &&
      (state.year > general.appearYear || (state.year === general.appearYear && state.month >= general.appearMonth))
    ) {
      logs.push(`${general.name}已在${state.cities.find((city) => city.id === general.locationCityId)?.name ?? "附近"}出现`);
      return { ...general, status: "wild" as const, factionId: "independent" };
    }
    return general;
  });
  return { state: { ...state, generals }, logs };
};

export const isGeneralSearchableNear = (general: General, cityId: string) =>
  general.status === "wild" && (general.locationCityId === cityId || areAdjacent(general.locationCityId, cityId));
