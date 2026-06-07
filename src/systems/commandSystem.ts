import type { BattleControlMode, CityActionType, CommandBreakdown, CommandCost, CommandPreferences, CommandState, Faction, GameState, General } from "../types";

export const actionLabels: Record<CityActionType | "attack", string> = {
  recruit: "征兵",
  agriculture: "发展农业",
  commerce: "发展商业",
  defense: "修筑城防",
  train: "训练士兵",
  search: "搜索武将",
  pacify: "安抚民心",
  scout: "侦察敌情",
  attack: "出征",
};

const findRulerGeneral = (state: GameState, faction: Faction): General | undefined =>
  state.generals.find((general) => general.name === faction.ruler || general.id === faction.id);

const averagePublicOrder = (state: GameState, factionId: string) => {
  const cities = state.cities.filter((city) => city.factionId === factionId);
  if (cities.length === 0) return 0;
  return Math.round(cities.reduce((sum, city) => sum + city.publicOrder, 0) / cities.length);
};

const hasRulerSkill = (ruler: General | undefined, skillIds: string[]) =>
  Boolean(ruler?.skills.some((skill) => skillIds.includes(skill)));

const normalizeBattleMode = (mode: unknown): BattleControlMode => {
  if (mode === "auto" || mode === "standard" || mode === "deep") return mode;
  if (mode === "semi") return "standard";
  return "auto";
};

export const defaultCommandPreferences = (state?: Partial<GameState>): CommandPreferences => ({
  battleControlMode: normalizeBattleMode(state?.battleControlMode ?? state?.commandPreferences?.battleControlMode ?? "standard"),
  battleSpeed: state?.commandPreferences?.battleSpeed ?? "normal",
  aiBattleLogLevel: state?.commandPreferences?.aiBattleLogLevel ?? "important",
});

export const getCommandCost = (action: CityActionType | "attack"): CommandCost => {
  if (["agriculture", "commerce", "defense", "search", "pacify"].includes(action)) return { political: 1, military: 0 };
  if (action === "attack") return { political: 0, military: 2 };
  return { political: 0, military: 1 };
};

export const formatCommandCost = (cost: CommandCost) => {
  const parts: string[] = [];
  if (cost.political > 0) parts.push(`政令 -${cost.political}`);
  if (cost.military > 0) parts.push(`军令 -${cost.military}`);
  return parts.join(" / ") || "无消耗";
};

const countUsedOrders = (state: GameState) => state.currentTurnCommandsUsed?.length ?? 0;

export const getRemainingActionableCities = (state: GameState, factionId = state.playerFactionId) =>
  state.cities.filter((city) => city.factionId === factionId && !city.actedThisTurn).length;

export const getCommandRecommendations = (state: GameState, factionId = state.playerFactionId) => {
  const cities = state.cities.filter((city) => city.factionId === factionId);
  const commandState = state.commandState;
  if (cities.length === 0) return ["当前已无可操作城池。"];
  const totalFood = cities.reduce((sum, city) => sum + city.food, 0);
  const totalTroopsValue = cities.reduce((sum, city) => sum + city.troops.infantry + city.troops.cavalry + city.troops.archer + city.troops.navy, 0);
  const frontCities = cities.filter((city) => city.publicOrder < 55 || city.morale < 55);
  const recommendations: string[] = [];
  if (commandState?.governanceLoad > 0 || frontCities.length > 0) recommendations.push("城多民心偏低，建议优先安抚前线或核心城市。");
  if (totalFood < Math.max(1600, totalTroopsValue * 0.35)) recommendations.push("当前粮草偏紧，建议发展农业或减少连续征兵。");
  if ((commandState?.militaryOrders ?? 0) >= 2) recommendations.push("军令充足，可先侦察再选择相邻弱城出征。");
  if ((commandState?.politicalOrders ?? 0) <= 0 && (commandState?.militaryOrders ?? 0) <= 0) recommendations.push("本回合指令已尽，建议结束回合。");
  if (recommendations.length === 0) recommendations.push("当前指令充足，可在发展核心城与整军备战之间取舍。");
  return recommendations.slice(0, 2);
};

const makeBreakdown = (base: number, cityBonus: number, rulerBonus: number, factionBonus: number, governancePenalty: number, final: number, label: string): CommandBreakdown => ({
  base,
  cityBonus,
  rulerBonus,
  factionBonus,
  governancePenalty,
  final,
  detail: [
    `${label}基础值 ${base}`,
    `城市加成 +${cityBonus}`,
    `主公能力加成 +${rulerBonus}`,
    `势力/技能加成 +${factionBonus}`,
    governancePenalty > 0 ? `统治负担 -${governancePenalty}` : "统治负担 0",
    `最终 ${final}`,
  ],
});

// 计算某势力新回合可用政令和军令，同时给出统治负担提示。
export const calculateCommandState = (state: GameState, factionId: string): CommandState => {
  const faction = state.factions.find((item) => item.id === factionId);
  const cities = state.cities.filter((city) => city.factionId === factionId);
  const cityCount = cities.length;
  const ruler = faction ? findRulerGeneral(state, faction) : undefined;
  const order = averagePublicOrder(state, factionId);

  const politicalBase = 2;
  const militaryBase = 1;
  const politicalCityBonus = Math.floor(cityCount / 2);
  const militaryCityBonus = Math.floor(cityCount / 3);
  const politicalRulerBonus = ((ruler?.politics ?? 0) >= 85 ? 1 : 0) + ((ruler?.charm ?? 0) >= 90 ? 1 : 0);
  const militaryRulerBonus = (ruler?.command ?? 0) >= 85 ? 1 : 0;
  const politicalFactionBonus = hasRulerSkill(ruler, ["hegemony", "gentry", "pacify", "benevolence"]) ? 1 : 0;
  const militaryFactionBonus = hasRulerSkill(ruler, ["command", "jiangdong", "hegemony"]) ? 1 : 0;
  const rawPolitical = politicalBase + politicalCityBonus + politicalRulerBonus + politicalFactionBonus;
  const rawMilitary = militaryBase + militaryCityBonus + militaryRulerBonus + militaryFactionBonus;

  let governanceLoad = 0;
  if (cityCount > 8 && order < 50) governanceLoad += 1;
  if (cityCount > 12 && order < 45) governanceLoad += 1;
  if ((ruler?.politics ?? 0) >= 90 && governanceLoad > 0) governanceLoad -= 1;
  if (hasRulerSkill(ruler, ["benevolence", "pacify"]) && governanceLoad > 0) governanceLoad -= 1;
  if (hasRulerSkill(ruler, ["tyranny"]) && order < 55 && cityCount > 6) governanceLoad += 1;

  const politicalPenalty = governanceLoad;
  const militaryPenalty = governanceLoad >= 2 ? 1 : 0;
  const maxPoliticalOrders = Math.max(1, rawPolitical - politicalPenalty);
  const maxMilitaryOrders = Math.max(1, rawMilitary - militaryPenalty);
  const commandEfficiency = Math.max(30, Math.min(100, Math.round((maxPoliticalOrders / Math.max(1, rawPolitical)) * 100)));
  const advisory =
    governanceLoad > 0
      ? "城市较多且民心偏低，政令效率下降，建议安抚民心或优先治理核心城。"
      : cityCount <= 2
        ? "势力尚小，指令有限，建议集中发展一座核心城并谨慎出兵。"
        : "当前统治负担可控，可在内政与军事之间分配指令。";

  const commandState: CommandState = {
    politicalOrders: maxPoliticalOrders,
    maxPoliticalOrders,
    militaryOrders: maxMilitaryOrders,
    maxMilitaryOrders,
    commandEfficiency,
    governanceLoad,
    averagePublicOrder: order,
    advisory,
    politicalBreakdown: makeBreakdown(politicalBase, politicalCityBonus, politicalRulerBonus, politicalFactionBonus, politicalPenalty, maxPoliticalOrders, "政令"),
    militaryBreakdown: makeBreakdown(militaryBase, militaryCityBonus, militaryRulerBonus, militaryFactionBonus, militaryPenalty, maxMilitaryOrders, "军令"),
    usedOrders: countUsedOrders(state),
    remainingActionableCities: getRemainingActionableCities(state, factionId),
    recommendations: [],
  };
  commandState.recommendations = getCommandRecommendations({ ...state, commandState }, factionId);
  return commandState;
};

export const ensureCommandState = (state: GameState): GameState => {
  const preferences = defaultCommandPreferences(state);
  const battleControlMode = preferences.battleControlMode;
  const commandState = state.commandState ?? calculateCommandState({ ...state, battleControlMode, commandPreferences: preferences }, state.playerFactionId);
  const normalizedState = {
    ...state,
    battleControlMode,
    commandPreferences: preferences,
    currentTurnCommandsUsed: state.currentTurnCommandsUsed ?? [],
  };
  return {
    ...normalizedState,
    commandState: {
      ...commandState,
      usedOrders: countUsedOrders(normalizedState),
      remainingActionableCities: getRemainingActionableCities(normalizedState),
      recommendations: getCommandRecommendations({ ...normalizedState, commandState }, normalizedState.playerFactionId),
    },
  };
};

export const refreshPlayerCommands = (state: GameState): GameState => {
  const resetState = { ...state, currentTurnCommandsUsed: [] };
  return {
    ...resetState,
    commandState: calculateCommandState(resetState, resetState.playerFactionId),
  };
};

export const canSpendCommand = (state: GameState, cost: CommandCost) => {
  const commandState = state.commandState ?? calculateCommandState(state, state.playerFactionId);
  if (cost.political > commandState.politicalOrders) return { ok: false, reason: "政令不足" };
  if (cost.military > commandState.militaryOrders) return { ok: false, reason: "军令不足" };
  return { ok: true, reason: "" };
};

// 消耗玩家指令点；调用方负责继续执行城市或战斗逻辑。
export const spendPlayerCommand = (state: GameState, cost: CommandCost, label: string, cityName?: string) => {
  const checked = canSpendCommand(state, cost);
  if (!checked.ok) return { state, ok: false, logs: [`${checked.reason}，无法执行${label}。`] };
  const commandState = state.commandState ?? calculateCommandState(state, state.playerFactionId);
  const next: GameState = {
    ...state,
    commandState: {
      ...commandState,
      politicalOrders: commandState.politicalOrders - cost.political,
      militaryOrders: commandState.militaryOrders - cost.military,
    },
    currentTurnCommandsUsed: [
      ...(state.currentTurnCommandsUsed ?? []),
      `${cityName ? `${cityName}：` : ""}${label}（${formatCommandCost(cost)}）`,
    ],
  };
  const updatedCommandState = {
    ...next.commandState,
    usedOrders: countUsedOrders(next),
    remainingActionableCities: getRemainingActionableCities(next),
    recommendations: getCommandRecommendations(next, next.playerFactionId),
  };
  return {
    state: { ...next, commandState: updatedCommandState },
    ok: true,
    logs: [`使用 ${formatCommandCost(cost)}：${cityName ? `${cityName}${label}` : label}。`],
  };
};

export const getCommandBlockedReason = (
  state: GameState,
  action: CityActionType | "attack",
  cityFactionId: string,
  cityActed: boolean,
  extraReason = "",
) => {
  if (cityFactionId !== state.playerFactionId) return "非己方城市";
  if (cityActed) return "城市已行动";
  const cost = getCommandCost(action);
  const checked = canSpendCommand(state, cost);
  if (!checked.ok) return checked.reason;
  return extraReason;
};
