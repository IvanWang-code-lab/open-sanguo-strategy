import type { City, GameState } from "../types";

const protectedUntilTurn = 12;
const supportTurns = [2, 4, 7, 10];

const configuredProtectedUntil = (state: GameState) => {
  const mode = state.commandPreferences?.liubeiProtectionMode ?? state.difficultyRuleSet?.liubeiProtection ?? "standard";
  if (mode === "off") return 0;
  if (mode === "extended") return 24;
  return protectedUntilTurn;
};

export const getScenarioTurn = (state: Pick<GameState, "year" | "month" | "scenarioId">) => {
  const startYear = state.scenarioId === "208" ? 208 : state.scenarioId === "219" ? 219 : 190;
  return Math.max(1, (state.year - startYear) * 12 + state.month);
};

export const ensureLiuBeiProtection = (state: GameState): GameState => {
  if (state.scenarioId !== "190") return state;
  return {
    ...state,
    liubeiProtection: state.liubeiProtection ?? {
      protectedUntilTurn: configuredProtectedUntil(state),
      supportTriggeredTurns: [],
    },
  };
};

// 190 剧本刘备仅一城开局，前 12 回合 AI 不主动吞并，避免普通难度一月灭亡。
export const isLiuBeiProtectedTarget = (state: GameState, targetCity: City) => {
  if (state.scenarioId !== "190" || targetCity.factionId !== "liu-bei") return false;
  if (configuredProtectedUntil(state) <= 0) return false;
  const protection = ensureLiuBeiProtection(state).liubeiProtection;
  const turn = getScenarioTurn(state);
  if (turn <= Math.max(configuredProtectedUntil(state), protection?.protectedUntilTurn ?? protectedUntilTurn)) return true;
  if (protection?.lastAttackedTurn && turn - protection.lastAttackedTurn <= 3) return true;
  return false;
};

export const applyLiuBeiEarlySupport = (state: GameState) => {
  const ensured = ensureLiuBeiProtection(state);
  if (ensured.scenarioId !== "190" || ensured.playerFactionId !== "liu-bei") return { state: ensured, logs: [] as string[] };
  const turn = getScenarioTurn(ensured);
  const protection = ensured.liubeiProtection ?? { protectedUntilTurn, supportTriggeredTurns: [] };
  const triggered = protection.supportTriggeredTurns ?? [];
  const liuBeiCities = ensured.cities.filter((city) => city.factionId === "liu-bei");
  if (!supportTurns.includes(turn) || triggered.includes(turn) || liuBeiCities.length === 0) return { state: ensured, logs: [] as string[] };

  const supportedCityId = liuBeiCities[0].id;
  const cities = ensured.cities.map((city) => {
    if (city.id !== supportedCityId) return city;
    return {
      ...city,
      gold: city.gold + 180,
      food: city.food + 260,
      troops: {
        infantry: city.troops.infantry + 220,
        cavalry: city.troops.cavalry + 60,
        archer: city.troops.archer + 90,
        navy: city.troops.navy,
      },
      morale: Math.min(100, city.morale + 4),
      publicOrder: Math.min(100, city.publicOrder + 3),
      recoveryHint: "乡勇来投，刘备军获得早期喘息空间。",
    };
  });

  return {
    state: {
      ...ensured,
      cities,
      liubeiProtection: {
        ...protection,
        supportTriggeredTurns: [...triggered, turn],
      },
    },
    logs: [`刘备仁德感召乡勇：${liuBeiCities[0].name}获得兵力、粮草与民心支援。`],
  };
};
