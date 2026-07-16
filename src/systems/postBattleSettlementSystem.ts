import { getActiveGeneralsAtCity } from "../selectors/generalSelectors";
import type {
  BattleOutcome,
  GameState,
  PendingPostBattleSettlement,
  PostBattleSettlementDecision,
  PostBattleSettlementMode,
  Troops,
} from "../types";
import { totalTroops } from "./unitSystem";

const zeroTroops = (): Troops => ({ infantry: 0, cavalry: 0, archer: 0, navy: 0 });

const addTroops = (left: Troops, right: Troops): Troops => ({
  infantry: left.infantry + right.infantry,
  cavalry: left.cavalry + right.cavalry,
  archer: left.archer + right.archer,
  navy: left.navy + right.navy,
});

const sumTroopsForGenerals = (pending: PendingPostBattleSettlement, generalIds: string[]) =>
  generalIds.reduce((sum, id) => addTroops(sum, pending.survivingTroopsByGeneral[id] ?? zeroTroops()), zeroTroops());

const currentTurn = (state: GameState) => (state.year - 190) * 12 + state.month;

const chooseGuard = (state: GameState, participantIds: string[]) => {
  const rulerName = state.factions.find((faction) => faction.id === state.playerFactionId)?.ruler;
  const candidates = state.generals
    .filter((general) => participantIds.includes(general.id))
    .sort((a, b) => {
      const aRulerPenalty = a.name === rulerName ? 1000 : 0;
      const bRulerPenalty = b.name === rulerName ? 1000 : 0;
      return b.command + b.force * 0.35 - bRulerPenalty - (a.command + a.force * 0.35 - aRulerPenalty);
    });
  return candidates[0]?.id ?? participantIds[0];
};

/** 为攻城胜利创建待确认处置，战斗阶段不在此时搬运任何参战武将。 */
export const createPendingPostBattleSettlement = (state: GameState, outcome: BattleOutcome): PendingPostBattleSettlement => {
  const participantIds = outcome.participantGeneralIds.filter((id) => state.generals.some((general) => general.id === id));
  const guardId = chooseGuard(state, participantIds);
  const selectedGarrisonGeneralIds = guardId ? [guardId] : [];
  const selectedReturnGeneralIds = participantIds.filter((id) => id !== guardId);
  const survivingTroopsByGeneral = Object.fromEntries(outcome.survivingUnits.map((unit) => [unit.generalId, unit.troops]));
  const assigned = Object.values(survivingTroopsByGeneral).reduce(addTroops, zeroTroops());
  const unassignedSurvivingTroops: Troops = {
    infantry: Math.max(0, outcome.attackerRemainingTroops.infantry - assigned.infantry),
    cavalry: Math.max(0, outcome.attackerRemainingTroops.cavalry - assigned.cavalry),
    archer: Math.max(0, outcome.attackerRemainingTroops.archer - assigned.archer),
    navy: Math.max(0, outcome.attackerRemainingTroops.navy - assigned.navy),
  };
  return {
    battleOutcomeId: outcome.battleId,
    sourceCityId: outcome.sourceCityId,
    targetCityId: outcome.targetCityId,
    attackerFactionId: outcome.attackerFactionId,
    participantGeneralIds: participantIds,
    survivingTroopsByGeneral,
    unassignedSurvivingTroops,
    sourceCityRemainingTroops: state.cities.find((city) => city.id === outcome.sourceCityId)?.troops ?? zeroTroops(),
    targetCityRemainingDefense: outcome.cityDefenseAfter,
    availableSettlementModes: ["splitGarrison", "returnMain", "allStation", "auto"],
    recommendedMode: "splitGarrison",
    selectedGarrisonGeneralIds,
    selectedReturnGeneralIds,
    createdAtTurn: currentTurn(state),
  };
};

/** 根据处置模式生成稳定兜底方案，刘备等主公优先返回根基城。 */
export const createSettlementDecision = (
  state: GameState,
  pending: PendingPostBattleSettlement,
  mode: PostBattleSettlementMode,
): PostBattleSettlementDecision => {
  if (mode === "allStation") {
    return { mode, garrisonGeneralIds: [...pending.participantGeneralIds], returnGeneralIds: [] };
  }
  const guardId = chooseGuard(state, pending.participantGeneralIds);
  if (!guardId) return { mode, garrisonGeneralIds: [], returnGeneralIds: [] };
  if (mode === "splitGarrison" && pending.participantGeneralIds.length >= 4) {
    const ranked = state.generals
      .filter((general) => pending.participantGeneralIds.includes(general.id))
      .sort((a, b) => b.command + b.force * 0.3 - (a.command + a.force * 0.3));
    const guards = ranked.filter((general) => general.id !== state.playerFactionId).slice(0, 2).map((general) => general.id);
    const garrisonGeneralIds = guards.length > 0 ? guards : [guardId];
    return { mode, garrisonGeneralIds, returnGeneralIds: pending.participantGeneralIds.filter((id) => !garrisonGeneralIds.includes(id)) };
  }
  return {
    mode,
    garrisonGeneralIds: [guardId],
    returnGeneralIds: pending.participantGeneralIds.filter((id) => id !== guardId),
  };
};

export const validateSettlementDecision = (
  state: GameState,
  decision: PostBattleSettlementDecision,
): { ok: boolean; reason: string } => {
  const pending = state.pendingPostBattleSettlement;
  if (!pending) return { ok: false, reason: "当前没有待处理的占城军势" };
  const garrison = Array.from(new Set(decision.garrisonGeneralIds));
  const returning = Array.from(new Set(decision.returnGeneralIds));
  if (garrison.length === 0) return { ok: false, reason: "新城至少需要一名武将驻守" };
  if (garrison.some((id) => returning.includes(id))) return { ok: false, reason: "同一武将不能同时驻守和回师" };
  const all = [...garrison, ...returning];
  if (all.length !== pending.participantGeneralIds.length || pending.participantGeneralIds.some((id) => !all.includes(id))) {
    return { ok: false, reason: "所有参战武将都必须明确去向" };
  }
  if (all.some((id) => !state.generals.some((general) => general.id === id && general.factionId === pending.attackerFactionId))) {
    return { ok: false, reason: "处置名单包含无效武将" };
  }
  return { ok: true, reason: "" };
};

/** 原子执行战后驻守/回师，并在完成后清除 pending 状态。 */
export const applyPostBattleSettlement = (
  state: GameState,
  decision: PostBattleSettlementDecision,
): { ok: boolean; state: GameState; logs: string[]; reason?: string } => {
  const checked = validateSettlementDecision(state, decision);
  const pending = state.pendingPostBattleSettlement;
  if (!checked.ok || !pending) return { ok: false, state, logs: [checked.reason], reason: checked.reason };

  let targetTroops = sumTroopsForGenerals(pending, decision.garrisonGeneralIds);
  const returnTroops = sumTroopsForGenerals(pending, decision.returnGeneralIds);
  targetTroops = addTroops(targetTroops, pending.unassignedSurvivingTroops);

  const generals = state.generals.map((general) => {
    if (decision.garrisonGeneralIds.includes(general.id)) return { ...general, locationCityId: pending.targetCityId };
    if (decision.returnGeneralIds.includes(general.id)) return { ...general, locationCityId: pending.sourceCityId };
    return general;
  });
  const cities = state.cities.map((city) => {
    if (city.id === pending.sourceCityId) return { ...city, troops: addTroops(city.troops, returnTroops) };
    if (city.id === pending.targetCityId) return { ...city, troops: targetTroops };
    return city;
  });
  const source = cities.find((city) => city.id === pending.sourceCityId);
  const target = cities.find((city) => city.id === pending.targetCityId);
  const garrisonNames = state.generals.filter((general) => decision.garrisonGeneralIds.includes(general.id)).map((general) => general.name);
  const returnNames = state.generals.filter((general) => decision.returnGeneralIds.includes(general.id)).map((general) => general.name);
  const summary = `${target?.name ?? "新城"}由${garrisonNames.join("、")}驻守；${returnNames.length ? `${returnNames.join("、")}回师${source?.name ?? "本城"}` : "主力全军驻守"}。`;
  const lastBattle = state.lastBattle && state.lastBattle.id === pending.battleOutcomeId
    ? {
        ...state.lastBattle,
        settlementSummary: summary,
        garrisonGeneralNames: garrisonNames,
        returnGeneralNames: returnNames,
        sourceCityTroopsAfter: source ? totalTroops(source.troops) : 0,
        targetCityTroopsAfter: target ? totalTroops(target.troops) : 0,
        keyFactors: [...(state.lastBattle.keyFactors ?? []), `战后处置：${summary}`],
      }
    : state.lastBattle;
  const next: GameState = {
    ...state,
    cities,
    generals,
    lastBattle,
    pendingPostBattleSettlement: undefined,
    history: [`${state.year}年${state.month}月：${summary}`, ...(state.history ?? [])].slice(0, 100),
    logs: [`战后处置：${summary}`, ...state.logs].slice(0, 30),
  };
  return { ok: true, state: next, logs: [`战后处置完成：${summary}`] };
};

/** AI 与长程模拟使用同一处置规则自动确认，避免留下玩家弹窗状态。 */
export const autoApplyPostBattleSettlement = (state: GameState) => {
  const pending = state.pendingPostBattleSettlement;
  if (!pending) return { ok: true, state, logs: [] as string[] };
  return applyPostBattleSettlement(state, createSettlementDecision(state, pending, "auto"));
};

