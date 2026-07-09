import type {
  BattleControlMode,
  CityActionType,
  CommandBreakdown,
  CommandCost,
  CommandPreferences,
  CommandState,
  Faction,
  GameState,
  General,
} from "../types";
import { totalTroops } from "./unitSystem";

export const actionLabels: Record<CityActionType | "attack", string> = {
  recruit: "征兵",
  agriculture: "发展农业",
  commerce: "发展商业",
  defense: "修筑城防",
  train: "训练士兵",
  search: "搜索武将",
  pacify: "安抚民心",
  scout: "侦察敌情",
  rest: "休整恢复",
  market: "市集采购",
  spy: "建立密探",
  suppressBandits: "剿匪治安",
  autoGovern: "自动治理",
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
  if (mode === "classic" || mode === "autoWatch" || mode === "quick") return mode;
  if (mode === "auto") return "quick";
  if (mode === "standard" || mode === "deep" || mode === "semi") return "classic";
  return "classic";
};

export const defaultCommandPreferences = (state?: Partial<GameState>): CommandPreferences => ({
  battleControlMode: normalizeBattleMode(state?.battleControlMode ?? state?.commandPreferences?.battleControlMode ?? "classic"),
  battleSpeed: state?.commandPreferences?.battleSpeed ?? "normal",
  aiBattleLogLevel: state?.commandPreferences?.aiBattleLogLevel ?? "important",
  tacticHints: state?.commandPreferences?.tacticHints ?? true,
  uiDensity: state?.commandPreferences?.uiDensity ?? "standard",
  autoSave: state?.commandPreferences?.autoSave ?? true,
  animationsEnabled: state?.commandPreferences?.animationsEnabled ?? true,
  soundEnabled: state?.commandPreferences?.soundEnabled ?? false,
  immersiveHints: state?.commandPreferences?.immersiveHints ?? true,
  aiLevel: state?.commandPreferences?.aiLevel ?? state?.difficultyRuleSet?.aiLevel ?? "normal",
  eventFrequency: state?.commandPreferences?.eventFrequency ?? state?.difficultyRuleSet?.eventFrequency ?? "normal",
  battleComplexity: state?.commandPreferences?.battleComplexity ?? state?.difficultyRuleSet?.battleComplexity ?? "standard",
  liubeiProtectionMode: state?.commandPreferences?.liubeiProtectionMode ?? state?.difficultyRuleSet?.liubeiProtection ?? "standard",
  autoGovernanceMode: state?.commandPreferences?.autoGovernanceMode ?? state?.difficultyRuleSet?.autoGovernance ?? "off",
});

export const getCommandCost = (_action: CityActionType | "attack"): CommandCost => ({
  commands: 1,
  political: 0,
  military: 0,
});

export const formatCommandCost = (cost: CommandCost) => `指令 -${cost.commands ?? 1}`;

const countUsedOrders = (state: GameState) => state.currentTurnCommandsUsed?.length ?? 0;

export const getRemainingActionableCities = (state: GameState) => Math.max(0, state.commandState?.commands ?? 0);

const makeBreakdown = (
  base: number,
  cityBonus: number,
  rulerBonus: number,
  factionBonus: number,
  policyBonus: number,
  governancePenalty: number,
  final: number,
): CommandBreakdown => ({
  base,
  cityBonus,
  rulerBonus,
  factionBonus,
  policyBonus,
  governancePenalty,
  final,
  detail: [
    `基础 ${base}`,
    `城市加成 +${cityBonus}`,
    `主公能力 +${rulerBonus}`,
    `势力特性 +${factionBonus}`,
    policyBonus > 0 ? `政策/名望 +${policyBonus}` : "政策/名望 0",
    governancePenalty > 0 ? `统治负担 -${governancePenalty}` : "统治负担 0",
    `最终 ${final}`,
  ],
});

export const getCommandRecommendations = (state: GameState, factionId = state.playerFactionId) => {
  const cities = state.cities.filter((city) => city.factionId === factionId);
  const commandState = state.commandState;
  if (cities.length === 0) return ["当前已无可操作城池。"];
  const totalFood = cities.reduce((sum, city) => sum + city.food, 0);
  const totalGold = cities.reduce((sum, city) => sum + city.gold, 0);
  const totalTroopValue = cities.reduce((sum, city) => sum + totalTroops(city.troops), 0);
  const lowOrderCities = cities.filter((city) => city.publicOrder < 55);
  const tiredCities = cities.filter((city) => (city.cityFatigue ?? 0) >= 45);
  const banditCities = cities.filter((city) => (city.banditPressure ?? 0) >= 35 || (city.localUnrest ?? 0) >= 35);
  const recommendations: string[] = [];

  if ((commandState?.commands ?? 0) <= 0) recommendations.push("本回合指令已尽，建议结束回合。");
  if (totalFood < Math.max(1600, totalTroopValue * 0.35)) recommendations.push("粮草偏紧，优先发展农业、市集采购或减少连续征兵。");
  if (totalGold < Math.max(900, cities.length * 180)) recommendations.push("金钱偏低，建议发展商业或暂缓大规模军事行动。");
  if (lowOrderCities.length > 0 || (commandState?.governanceLoad ?? 0) > 0) recommendations.push("民心或统治负担偏高，建议安抚核心/前线城市。");
  if (tiredCities.length > 0) recommendations.push("部分城市疲劳偏高，建议休整后再连续出征。");
  if (banditCities.length > 0) recommendations.push("地方治安有压力，可剿匪或安抚以恢复收益。");
  if ((state.talentRumors ?? []).length > 0) recommendations.push("人才传闻正在流动，可在人才署搜索确认。");
  if ((state.caravanMarketState?.active ?? false) && state.caravanMarketState?.cityId) recommendations.push("商队抵达，可用一次指令采购粮草、情报或宝物线索。");
  if (recommendations.length === 0) recommendations.push("当前指令充足，可在核心发展、前线整备、侦察出征之间取舍。");
  return recommendations.slice(0, 3);
};

export const calculateCommandState = (state: GameState, factionId: string): CommandState => {
  const faction = state.factions.find((item) => item.id === factionId);
  const cities = state.cities.filter((city) => city.factionId === factionId);
  const cityCount = cities.length;
  const ruler = faction ? findRulerGeneral(state, faction) : undefined;
  const order = averagePublicOrder(state, factionId);

  const base = 3;
  const cityBonus = Math.floor(cityCount / 3);
  const rulerBonus =
    ((ruler?.politics ?? 0) >= 85 ? 1 : 0) +
    ((ruler?.command ?? 0) >= 88 ? 1 : 0) +
    ((ruler?.charm ?? 0) >= 92 ? 1 : 0);
  const factionBonus = hasRulerSkill(ruler, ["hegemony", "gentry", "pacify", "benevolence", "command", "jiangdong"]) ? 1 : 0;
  const policyBonus = (state.rulerReputation ?? 50) >= 75 || (state.factionLegitimacy ?? 50) >= 75 ? 1 : 0;
  const raw = base + cityBonus + rulerBonus + factionBonus + policyBonus;

  let governanceLoad = 0;
  if (cityCount > 8 && order < 50) governanceLoad += 1;
  if (cityCount > 12 && order < 45) governanceLoad += 1;
  if ((ruler?.politics ?? 0) >= 90 && governanceLoad > 0) governanceLoad -= 1;
  if (hasRulerSkill(ruler, ["benevolence", "pacify"]) && governanceLoad > 0) governanceLoad -= 1;
  if (hasRulerSkill(ruler, ["tyranny"]) && order < 55 && cityCount > 6) governanceLoad += 1;

  const maxCommands = Math.max(factionId === "liu-bei" ? 3 : 2, raw - governanceLoad);
  const commandEfficiency = Math.max(30, Math.min(100, Math.round((maxCommands / Math.max(1, raw)) * 100)));
  const advisory =
    governanceLoad > 0
      ? "城市较多且民心偏低，指令效率下降，建议安抚民心或治理核心城市。"
      : cityCount <= 2
        ? "势力尚小，指令有限，建议集中发展一座核心城并谨慎出兵。"
        : "当前统治负担可控，可在内政、计略与军事之间分配指令。";

  const unifiedBreakdown = makeBreakdown(base, cityBonus, rulerBonus, factionBonus, policyBonus, governanceLoad, maxCommands);
  const commandState: CommandState = {
    commands: maxCommands,
    maxCommands,
    usedCommands: 0,
    politicalOrders: maxCommands,
    maxPoliticalOrders: maxCommands,
    militaryOrders: maxCommands,
    maxMilitaryOrders: maxCommands,
    usedPoliticalOrders: 0,
    usedMilitaryOrders: 0,
    commandEfficiency,
    governanceLoad,
    averagePublicOrder: order,
    advisory,
    commandBreakdown: { political: unifiedBreakdown, military: unifiedBreakdown },
    politicalBreakdown: unifiedBreakdown,
    militaryBreakdown: unifiedBreakdown,
    usedOrders: countUsedOrders(state),
    remainingActionableCities: maxCommands,
    recommendations: [],
    commandAdvice: [],
  };
  const recommendations = getCommandRecommendations({ ...state, commandState }, factionId);
  return { ...commandState, recommendations, commandAdvice: recommendations };
};

export const ensureCommandState = (state: GameState): GameState => {
  const preferences = defaultCommandPreferences(state);
  const battleControlMode = preferences.battleControlMode;
  const normalizedCities = state.cities.map((city) => ({
    ...city,
    cityFatigue: city.cityFatigue ?? 0,
    woundedTroops: city.woundedTroops ?? 0,
    banditPressure: city.banditPressure ?? 0,
    localUnrest: city.localUnrest ?? 0,
    recoveryHint: city.recoveryHint ?? "状态稳定。",
  }));
  const normalizedState: GameState = {
    ...state,
    cities: normalizedCities,
    battleControlMode,
    commandPreferences: preferences,
    currentTurnCommandsUsed: state.currentTurnCommandsUsed ?? [],
    commandHistory: state.commandHistory ?? [],
    eventHistory: state.eventHistory ?? [],
    regionObjectives: state.regionObjectives ?? [],
  };
  const fallback = calculateCommandState(normalizedState, normalizedState.playerFactionId);
  const source = normalizedState.commandState ?? fallback;
  const maxCommands = source.maxCommands ?? fallback.maxCommands ?? Math.max(source.maxPoliticalOrders ?? 0, source.maxMilitaryOrders ?? 0, fallback.maxCommands ?? 3);
  const usedCommands = source.usedCommands ?? Math.min(maxCommands, source.usedOrders ?? countUsedOrders(normalizedState));
  const commands = Math.max(0, source.commands ?? Math.max(0, maxCommands - usedCommands));
  const unifiedBreakdown = source.politicalBreakdown ?? source.commandBreakdown?.political ?? fallback.politicalBreakdown!;
  const commandState: CommandState = {
    ...fallback,
    ...source,
    commands,
    maxCommands,
    usedCommands,
    politicalOrders: commands,
    maxPoliticalOrders: maxCommands,
    militaryOrders: commands,
    maxMilitaryOrders: maxCommands,
    usedPoliticalOrders: usedCommands,
    usedMilitaryOrders: usedCommands,
    politicalBreakdown: unifiedBreakdown,
    militaryBreakdown: unifiedBreakdown,
    commandBreakdown: { political: unifiedBreakdown, military: unifiedBreakdown },
    usedOrders: countUsedOrders(normalizedState),
    remainingActionableCities: commands,
  };
  const recommendations = getCommandRecommendations({ ...normalizedState, commandState }, normalizedState.playerFactionId);
  return {
    ...normalizedState,
    commandState: { ...commandState, recommendations, commandAdvice: recommendations },
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
  const required = cost.commands ?? 1;
  if ((commandState.commands ?? 0) < required) return { ok: false, reason: "指令不足" };
  return { ok: true, reason: "" };
};

export const spendPlayerCommand = (state: GameState, cost: CommandCost, label: string, cityName?: string) => {
  const checked = canSpendCommand(state, cost);
  if (!checked.ok) return { state, ok: false, logs: [`${checked.reason}，无法执行【${label}】。`] };
  const commandState = state.commandState ?? calculateCommandState(state, state.playerFactionId);
  const required = cost.commands ?? 1;
  const nextCommands = Math.max(0, (commandState.commands ?? 0) - required);
  const nextUsed = (commandState.usedCommands ?? 0) + required;
  const next: GameState = {
    ...state,
    commandState: {
      ...commandState,
      commands: nextCommands,
      usedCommands: nextUsed,
      politicalOrders: nextCommands,
      militaryOrders: nextCommands,
      usedPoliticalOrders: nextUsed,
      usedMilitaryOrders: nextUsed,
      remainingActionableCities: nextCommands,
    },
    currentTurnCommandsUsed: [
      ...(state.currentTurnCommandsUsed ?? []),
      `${cityName ? `${cityName}：` : ""}${label}（${formatCommandCost(cost)}）`,
    ],
    commandHistory: [
      `${state.year}年${state.month}月：${cityName ? `${cityName} ` : ""}${label}（${formatCommandCost(cost)}）`,
      ...(state.commandHistory ?? []),
    ].slice(0, 32),
  };
  const recommendations = getCommandRecommendations(next, next.playerFactionId);
  return {
    state: { ...next, commandState: { ...next.commandState, usedOrders: countUsedOrders(next), recommendations, commandAdvice: recommendations } },
    ok: true,
    logs: [`使用 ${formatCommandCost(cost)}：${cityName ? `${cityName}${label}` : label}。`],
  };
};

export const getCommandBlockedReason = (
  state: GameState,
  action: CityActionType | "attack",
  cityFactionId: string,
  _cityActed: boolean,
  extraReason = "",
) => {
  if (cityFactionId !== state.playerFactionId) return "非己方城市";
  if (extraReason) return extraReason;
  const checked = canSpendCommand(state, getCommandCost(action));
  if (!checked.ok) return checked.reason;
  return "";
};
