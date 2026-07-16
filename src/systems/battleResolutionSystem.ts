import { getActiveGeneralsAtCity } from "../selectors/generalSelectors";
import type {
  BattleOutcome,
  BattleReport,
  BattlefieldState,
  BattleUnit,
  GameState,
  PendingBattle,
  Troops,
} from "../types";
import { sumUnitTroops } from "./battlefieldSystem";
import { grantGeneralExp } from "./generalSystem";
import { ensureLiuBeiProtection, getScenarioTurn } from "./liubeiBalanceSystem";
import { createPendingPostBattleSettlement } from "./postBattleSettlementSystem";
import { totalTroops } from "./unitSystem";

const emptyTroops = (): Troops => ({ infantry: 0, cavalry: 0, archer: 0, navy: 0 });

const addTroops = (left: Troops, right: Troops): Troops => ({
  infantry: left.infantry + right.infantry,
  cavalry: left.cavalry + right.cavalry,
  archer: left.archer + right.archer,
  navy: left.navy + right.navy,
});

const subtractTroops = (left: Troops, right: Troops): Troops => ({
  infantry: Math.max(0, left.infantry - right.infantry),
  cavalry: Math.max(0, left.cavalry - right.cavalry),
  archer: Math.max(0, left.archer - right.archer),
  navy: Math.max(0, left.navy - right.navy),
});

const participatingGeneralIds = (battlefield: BattlefieldState) => battlefield.playerUnits
  .map((unit) => unit.generalId)
  .filter((id) => !id.startsWith("player-militia"));

const enemyCommander = (battlefield: BattlefieldState) => battlefield.enemyUnits.find((unit) => unit.role === "commander") ?? battlefield.enemyUnits[0];
const playerCommander = (battlefield: BattlefieldState) => battlefield.playerUnits.find((unit) => unit.role === "commander") ?? battlefield.playerUnits[0];

const unitStory = (battlefield: BattlefieldState) => {
  const best = [...battlefield.playerUnits].sort((a, b) => b.kills + b.skillUses * 120 - (a.kills + a.skillUses * 120))[0];
  if (!best) return "本战未出现明显转折。";
  return `第${Math.max(1, battlefield.round - 1)}回合前后，${best.generalName}部贡献突出，击破${best.kills}并释放技能${best.skillUses}次。`;
};

const survivorTroops = (unit: BattleUnit): Troops => {
  if (unit.troops <= 0 || unit.maxTroops <= 0) return emptyTroops();
  const ratio = unit.troops / unit.maxTroops;
  const troops: Troops = {
    infantry: Math.floor(unit.unitTypeMix.infantry * ratio),
    cavalry: Math.floor(unit.unitTypeMix.cavalry * ratio),
    archer: Math.floor(unit.unitTypeMix.archer * ratio),
    navy: Math.floor(unit.unitTypeMix.navy * ratio),
  };
  const delta = Math.max(0, unit.troops - totalTroops(troops));
  const dominant = (Object.keys(troops) as Array<keyof Troops>).sort((a, b) => unit.unitTypeMix[b] - unit.unitTypeMix[a])[0] ?? "infantry";
  troops[dominant] += delta;
  return troops;
};

/** 将经典战场的纯战斗结果转换为不含城池去向副作用的 BattleOutcome。 */
export const createBattleOutcome = (
  state: GameState,
  pendingBattle: PendingBattle,
  battlefield: BattlefieldState,
): BattleOutcome | undefined => {
  const result = battlefield.result;
  const source = state.cities.find((city) => city.id === pendingBattle.attackerCityId);
  const target = state.cities.find((city) => city.id === pendingBattle.defenderCityId);
  if (!result || !source || !target) return undefined;

  const sortieTroops = pendingBattle.formation.sortieTroops ?? sumUnitTroops(battlefield.playerUnits.map((unit) => ({ ...unit, troops: unit.maxTroops })));
  const attackerRemainingTroops = sumUnitTroops(battlefield.playerUnits);
  const defenderRemainingTroops = sumUnitTroops(battlefield.enemyUnits);
  const participantGeneralIds = participatingGeneralIds(battlefield);
  const attackerWins = result.winner === "attacker";
  const fatigueDelta = Math.max(6, Math.min(40, Math.floor(result.attackerLoss / Math.max(80, totalTroops(sortieTroops) / 10)) + (attackerWins ? 8 : 16)));
  const sourceMoraleDelta = attackerWins ? -4 : result.winner === "withdraw" ? -5 : -9;
  const targetMoraleDelta = attackerWins ? -3 : 4;
  const commander = playerCommander(battlefield);
  const defender = enemyCommander(battlefield);
  const skillRecords = battlefield.battleLog
    .filter((line) => line.includes("发动【"))
    .map((line, index) => ({
      round: index + 1,
      unitId: "log",
      generalName: line.split("发动【")[0],
      skillId: "active",
      skillName: line.match(/【(.+?)】/)?.[1] ?? "技能",
      target: "战场",
      effect: line,
    }));
  const commandRecords = battlefield.battleLog
    .filter((line) => line.includes("回合执行"))
    .map((line, index) => ({
      round: index + 1,
      unitId: "round",
      generalName: commander?.generalName ?? "我军",
      commandType: "attack" as const,
      summary: line,
    }));
  result.skillRecords = skillRecords;
  result.commandRecords = commandRecords;
  result.cityChanges = attackerWins ? [`${target.name}已被攻克，等待战后军势处置`] : [`${target.name}守住城池`];
  result.summary = attackerWins
    ? `${commander?.generalName ?? "我军"}突破${target.name}防线，城池已下。`
    : result.winner === "withdraw"
      ? "我军主动撤退，保留再战之力。"
      : `${defender?.generalName ?? "守军"}守住${target.name}，我军败退。`;
  result.nextAdvice = attackerWins ? "先决定新城驻守与主力回师，再安排安抚和休整。" : "战后建议训练、休整、侦察敌情，等待士气恢复后再战。";

  const supplyCost = pendingBattle.formation.supplyCost ?? Math.ceil(totalTroops(sortieTroops) * 0.14);
  const report: BattleReport = {
    id: battlefield.battleId,
    attackerFactionId: source.factionId,
    defenderFactionId: target.factionId,
    attackerCityName: source.name,
    defenderCityName: target.name,
    attackerGeneralId: commander?.generalId,
    defenderGeneralId: defender?.generalId,
    attackerGeneral: commander?.generalName ?? "我军主将",
    defenderGeneral: defender?.generalName ?? "守军主将",
    defenderTerrain: target.terrain,
    defenderDefense: target.defense,
    attackerStart: totalTroops(sortieTroops),
    defenderStart: battlefield.enemyUnits.reduce((sum, unit) => sum + unit.maxTroops, 0),
    sortieTroops,
    garrisonTroops: pendingBattle.formation.garrisonTroops ?? emptyTroops(),
    sortieTotal: totalTroops(sortieTroops),
    garrisonTotal: pendingBattle.formation.garrisonTroops ? totalTroops(pendingBattle.formation.garrisonTroops) : 0,
    supplyCost,
    garrisonRisk: pendingBattle.formation.garrisonRisk,
    garrisonRiskLevel: pendingBattle.formation.garrisonRiskLevel,
    cityFatigueDelta: fatigueDelta,
    battleAftermath: result.summary,
    recoveryHint: attackerWins ? "等待确认驻守与回师安排。" : "出征城市需要休整。",
    attackerLoss: result.attackerLoss,
    defenderLoss: result.defenderLoss,
    attackerRemaining: result.attackerRemaining,
    defenderRemaining: result.defenderRemaining,
    attackerMorale: Math.round(battlefield.playerUnits.reduce((sum, unit) => sum + unit.morale, 0) / Math.max(1, battlefield.playerUnits.length)),
    defenderMorale: Math.round(battlefield.enemyUnits.reduce((sum, unit) => sum + unit.morale, 0) / Math.max(1, battlefield.enemyUnits.length)),
    winner: attackerWins ? "attacker" : "defender",
    occupied: attackerWins,
    skillMessages: skillRecords.map((record) => record.effect),
    resultText: result.summary,
    mvpText: unitStory(battlefield),
    expMessages: [],
    armyFormation: pendingBattle.formation,
    battleTimeline: battlefield.battleLog,
    keyFactors: [
      `参战部队：${battlefield.playerUnits.map((unit) => `${unit.generalName}部`).join("、")}`,
      `主动技能释放：${skillRecords.length}次`,
      `城防变化：-${result.cityDefenseDamage}`,
      `玩家命令轮次：${commandRecords.length}`,
    ],
    nextAdvice: result.nextAdvice,
    commandGrade: attackerWins ? "A" : result.attackerLoss < result.defenderLoss ? "B" : "C",
    commanderContribution: `${commander?.generalName ?? "主将"}指挥${commander?.maxTroops.toLocaleString() ?? 0}兵，剩余${commander?.troops.toLocaleString() ?? 0}。`,
    advisorContribution: "军师与后军提供技能、稳军与战机支持。",
    wingContributions: battlefield.playerUnits.filter((unit) => ["left", "right", "vanguard", "rear"].includes(unit.role)).map((unit) => `${unit.generalName}部：杀伤${unit.kills}，损失${unit.losses}，技能${unit.skillUses}次。`),
    commandScore: Math.max(40, Math.min(100, 60 + (attackerWins ? 18 : -8) + skillRecords.length * 3 - Math.floor(result.attackerLoss / Math.max(100, totalTroops(sortieTroops) / 10)))),
    playerControlSummary: `玩家在战场中指挥${battlefield.playerUnits.length}支部队，执行${commandRecords.length}轮命令，释放${skillRecords.length}次主动技能。`,
    battleTitle: `${source.name}攻${target.name}之战`,
    battleSummary: result.summary,
    historicalNarrative: `${result.summary}${unitStory(battlefield)} 战斗中城防下降${result.cityDefenseDamage}，我军损失${result.attackerLoss}，敌军损失${result.defenderLoss}。`,
    tacticStory: battlefield.battleLog,
    comboMessages: [],
    counterMessages: [],
    decisiveEvents: skillRecords.slice(0, 3).map((record) => record.effect),
    battlefieldResult: result,
    unitResults: result.unitResults,
    skillRecords,
    commandRecords,
  };
  const experienceAwards: Record<string, number> = Object.fromEntries(participantGeneralIds.map((id) => [id, attackerWins ? 28 : 12]));
  if (defender && !defender.generalId.startsWith("enemy-militia")) experienceAwards[defender.generalId] = attackerWins ? 10 : 24;
  const capturedGeneralIds = attackerWins ? getActiveGeneralsAtCity(state, target.id).map((general) => general.id) : [];
  const battleHistoryEntry = {
    id: `archive-${report.id}`,
    turn: (state.year - 190) * 12 + state.month,
    title: report.battleTitle ?? `${source.name}攻${target.name}`,
    summary: report.battleSummary ?? report.resultText,
    highlights: [report.mvpText, ...(report.decisiveEvents ?? []).slice(0, 2), attackerWins ? `${target.name}易主，待安置军势` : `${target.name}守住城池`].filter(Boolean),
  };
  return {
    battleId: battlefield.battleId,
    sourceCityId: source.id,
    targetCityId: target.id,
    attackerFactionId: source.factionId,
    defenderFactionId: target.factionId,
    winnerFactionId: attackerWins ? source.factionId : target.factionId,
    victoryType: result.outcome,
    conquered: attackerWins,
    participantGeneralIds,
    survivingUnits: battlefield.playerUnits
      .filter((unit) => participantGeneralIds.includes(unit.generalId))
      .map((unit) => ({ generalId: unit.generalId, role: unit.role, troops: survivorTroops(unit), morale: unit.morale })),
    sortieTroops,
    attackerRemainingTroops,
    defenderRemainingTroops,
    troopLosses: { attacker: result.attackerLoss, defender: result.defenderLoss },
    woundedGeneralIds: battlefield.playerUnits.filter((unit) => unit.isRouted).map((unit) => unit.generalId).filter((id) => participantGeneralIds.includes(id)),
    capturedGeneralIds,
    fatigueChanges: { sourceCity: fatigueDelta, targetCity: attackerWins ? Math.floor(fatigueDelta / 2) : 4 },
    moraleChanges: { sourceCity: sourceMoraleDelta, targetCity: targetMoraleDelta },
    cityDefenseAfter: Math.max(attackerWins ? 8 : 5, target.defense - result.cityDefenseDamage),
    experienceAwards,
    battleHistoryEntry,
    recommendedSettlement: "splitGarrison",
    report,
    logs: [`${report.battleTitle}：${report.battleSummary}`, ...skillRecords.slice(-5).map((record) => record.effect)],
  };
};

/** 战果唯一回写入口；占城时只生成 pending settlement，不决定参战武将去向。 */
export const applyBattleOutcome = (state: GameState, outcome: BattleOutcome) => {
  const source = state.cities.find((city) => city.id === outcome.sourceCityId);
  const target = state.cities.find((city) => city.id === outcome.targetCityId);
  if (!source || !target) return { state, report: undefined as BattleReport | undefined, logs: ["战果城市引用无效"], outcome: undefined as BattleOutcome | undefined };
  const supplyCost = Math.min(source.food, outcome.report.supplyCost ?? Math.ceil(totalTroops(outcome.sortieTroops) * 0.14));
  const cities = state.cities.map((city) => {
    if (city.id === source.id) {
      const afterSortie = subtractTroops(city.troops, outcome.sortieTroops);
      return {
        ...city,
        troops: outcome.conquered ? afterSortie : addTroops(afterSortie, outcome.attackerRemainingTroops),
        food: Math.max(0, city.food - supplyCost),
        morale: Math.max(30, Math.min(100, city.morale + outcome.moraleChanges.sourceCity)),
        cityFatigue: Math.min(100, (city.cityFatigue ?? 0) + outcome.fatigueChanges.sourceCity),
        recoveryHint: outcome.conquered ? "主力尚待分配驻守与回师。" : "战后部队已回城，建议休整恢复。",
        actedThisTurn: true,
      };
    }
    if (city.id === target.id) {
      return {
        ...city,
        factionId: outcome.conquered ? outcome.attackerFactionId : city.factionId,
        troops: outcome.conquered ? emptyTroops() : outcome.defenderRemainingTroops,
        defense: outcome.cityDefenseAfter,
        morale: Math.max(30, Math.min(100, city.morale + outcome.moraleChanges.targetCity)),
        publicOrder: outcome.conquered ? Math.max(25, city.publicOrder - 12) : Math.max(35, city.publicOrder - 5),
        cityFatigue: Math.min(100, (city.cityFatigue ?? 0) + outcome.fatigueChanges.targetCity),
        recoveryHint: outcome.conquered ? "新占城市等待驻守军势入城。" : "守军经战后需要恢复秩序。",
        actedThisTurn: outcome.conquered ? true : city.actedThisTurn,
      };
    }
    return city;
  });

  const expLogs: string[] = [];
  const generals = state.generals.map((general) => {
    let next = general;
    const award = outcome.experienceAwards[general.id];
    if (award) {
      const gained = grantGeneralExp(next, award);
      next = gained.general;
      expLogs.push(`${general.name}获得${award}经验`, ...gained.logs);
    }
    if (outcome.capturedGeneralIds.includes(general.id)) next = { ...next, status: "captured", locationCityId: "" };
    return next;
  });
  const report = { ...outcome.report, expMessages: expLogs };
  let nextState: GameState = {
    ...state,
    cities,
    generals,
    lastBattle: report,
    enhancedWarArchive: [outcome.battleHistoryEntry, ...(state.enhancedWarArchive ?? [])].slice(0, 80),
    longSimStats: {
      turnsSimulated: state.longSimStats?.turnsSimulated ?? 0,
      battles: (state.longSimStats?.battles ?? 0) + 1,
      events: state.longSimStats?.events ?? 0,
    },
  };
  if (state.scenarioId === "190" && outcome.defenderFactionId === "liu-bei" && outcome.attackerFactionId !== "liu-bei") {
    const protectedState = ensureLiuBeiProtection(nextState);
    nextState = {
      ...protectedState,
      liubeiProtection: {
        ...(protectedState.liubeiProtection ?? { protectedUntilTurn: 12, supportTriggeredTurns: [] }),
        lastAttackedTurn: getScenarioTurn(state),
      },
    };
  }
  if (outcome.conquered) nextState = { ...nextState, pendingPostBattleSettlement: createPendingPostBattleSettlement(nextState, outcome) };
  return {
    state: nextState,
    report,
    logs: [...outcome.logs, ...expLogs.slice(-4), ...(outcome.conquered ? ["城池已下，请先决定驻守与回师安排。"] : [])],
    outcome,
  };
};

export const applyBattlefieldResult = (state: GameState, pendingBattle: PendingBattle, battlefield: BattlefieldState) => {
  const outcome = createBattleOutcome(state, pendingBattle, battlefield);
  if (!outcome) return { state, report: undefined as BattleReport | undefined, logs: ["战场结果无效"], outcome: undefined as BattleOutcome | undefined };
  return applyBattleOutcome(state, outcome);
};

