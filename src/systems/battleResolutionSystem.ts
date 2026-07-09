import { applyExpToGeneral } from "./generalSystem";
import { sumUnitTroops } from "./battlefieldSystem";
import { ensureLiuBeiProtection, getScenarioTurn } from "./liubeiBalanceSystem";
import { totalTroops } from "./unitSystem";
import type { BattleReport, BattlefieldState, City, GameState, PendingBattle, Troops } from "../types";

const emptyTroops: Troops = { infantry: 0, cavalry: 0, archer: 0, navy: 0 };

const addTroops = (a: Troops, b: Troops): Troops => ({
  infantry: a.infantry + b.infantry,
  cavalry: a.cavalry + b.cavalry,
  archer: a.archer + b.archer,
  navy: a.navy + b.navy,
});

const subtractTroops = (a: Troops, b: Troops): Troops => ({
  infantry: Math.max(0, a.infantry - b.infantry),
  cavalry: Math.max(0, a.cavalry - b.cavalry),
  archer: Math.max(0, a.archer - b.archer),
  navy: Math.max(0, a.navy - b.navy),
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

export const applyBattlefieldResult = (state: GameState, pendingBattle: PendingBattle, battlefield: BattlefieldState) => {
  const result = battlefield.result;
  const attackerCity = state.cities.find((city) => city.id === pendingBattle.attackerCityId);
  const defenderCity = state.cities.find((city) => city.id === pendingBattle.defenderCityId);
  if (!result || !attackerCity || !defenderCity) return { state, report: undefined as BattleReport | undefined, logs: ["战场结果无效"] };

  const sentTroops = pendingBattle.formation.sortieTroops ?? sumUnitTroops(battlefield.playerUnits.map((unit) => ({ ...unit, troops: unit.maxTroops })));
  const playerRemainingTroops = sumUnitTroops(battlefield.playerUnits);
  const enemyRemainingTroops = sumUnitTroops(battlefield.enemyUnits);
  const participantIds = participatingGeneralIds(battlefield);
  const supplyCost = pendingBattle.formation.supplyCost ?? Math.ceil(totalTroops(sentTroops) * 0.14);
  const fatigueDelta = Math.max(6, Math.min(40, Math.floor(result.attackerLoss / Math.max(80, totalTroops(sentTroops) / 10)) + (result.winner === "attacker" ? 8 : 16)));
  const attackerWins = result.winner === "attacker";
  const withdraw = result.winner === "withdraw";

  let nextCities: City[] = state.cities.map((city) => city);
  let nextGenerals = state.generals;

  if (attackerWins) {
    nextCities = state.cities.map((city) => {
      if (city.id === attackerCity.id) {
        return {
          ...city,
          troops: subtractTroops(city.troops, sentTroops),
          food: Math.max(0, city.food - supplyCost),
          generals: city.generals.filter((id) => !participantIds.includes(id)),
          morale: Math.max(40, city.morale - 4),
          cityFatigue: Math.min(100, (city.cityFatigue ?? 0) + fatigueDelta),
          recoveryHint: "主力出征后需要整备与补防。",
          actedThisTurn: true,
        };
      }
      if (city.id === defenderCity.id) {
        return {
          ...city,
          factionId: attackerCity.factionId,
          troops: playerRemainingTroops,
          generals: participantIds,
          defense: Math.max(8, city.defense - result.cityDefenseDamage),
          morale: Math.max(45, Math.min(90, attackerCity.morale - 3)),
          publicOrder: Math.max(25, city.publicOrder - 12),
          cityFatigue: Math.min(100, (city.cityFatigue ?? 0) + Math.floor(fatigueDelta / 2)),
          recoveryHint: "新占城市需要安抚和整备。",
          actedThisTurn: true,
        };
      }
      return city;
    });
    nextGenerals = nextGenerals.map((general) => participantIds.includes(general.id) ? { ...general, locationCityId: defenderCity.id } : general);
  } else {
    nextCities = state.cities.map((city) => {
      if (city.id === attackerCity.id) {
        return {
          ...city,
          troops: addTroops(subtractTroops(city.troops, sentTroops), playerRemainingTroops),
          food: Math.max(0, city.food - supplyCost),
          morale: Math.max(30, city.morale - (withdraw ? 5 : 9)),
          cityFatigue: Math.min(100, (city.cityFatigue ?? 0) + fatigueDelta),
          recoveryHint: withdraw ? "主动撤退后应休整恢复士气。" : "战败后疲劳上升，建议休整、训练或补兵。",
          actedThisTurn: true,
        };
      }
      if (city.id === defenderCity.id) {
        return {
          ...city,
          troops: enemyRemainingTroops,
          defense: Math.max(5, city.defense - result.cityDefenseDamage),
          morale: Math.min(100, city.morale + 4),
          cityFatigue: Math.min(100, (city.cityFatigue ?? 0) + 4),
          recoveryHint: "守军经战后需要恢复秩序。",
        };
      }
      return city;
    });
  }

  let nextState: GameState = { ...state, cities: nextCities, generals: nextGenerals };
  if (state.scenarioId === "190" && defenderCity.factionId === "liu-bei" && attackerCity.factionId !== "liu-bei") {
    const protectedState = ensureLiuBeiProtection(nextState);
    nextState = {
      ...protectedState,
      liubeiProtection: {
        ...(protectedState.liubeiProtection ?? { protectedUntilTurn: 12, supportTriggeredTurns: [] }),
        lastAttackedTurn: getScenarioTurn(state),
      },
    };
  }
  const expMessages: string[] = [];
  for (const unit of battlefield.playerUnits) {
    if (unit.generalId.startsWith("player-militia")) continue;
    const exp = applyExpToGeneral(nextState, unit.generalId, attackerWins ? 28 : 12);
    nextState = exp.state;
    expMessages.push(`${unit.generalName}获得${attackerWins ? 28 : 12}经验`, ...exp.logs);
  }
  const enemyLead = enemyCommander(battlefield);
  if (enemyLead && !enemyLead.generalId.startsWith("enemy-militia")) {
    const exp = applyExpToGeneral(nextState, enemyLead.generalId, attackerWins ? 10 : 24);
    nextState = exp.state;
    expMessages.push(`${enemyLead.generalName}获得${attackerWins ? 10 : 24}经验`, ...exp.logs);
  }

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
  result.experienceGains = expMessages;
  result.cityChanges = attackerWins ? [`${defenderCity.name}归属变为${state.factions.find((faction) => faction.id === attackerCity.factionId)?.name ?? "我方"}`] : [`${defenderCity.name}守住城池`];
  result.summary = attackerWins ? `${commander?.generalName ?? "我军"}突破${defenderCity.name}防线，攻势得手。` : withdraw ? "我军主动撤退，保留再战之力。" : `${defender?.generalName ?? "守军"}守住${defenderCity.name}，我军败退。`;
  result.nextAdvice = attackerWins ? "胜后优先安抚新城、休整疲劳，再决定是否继续扩张。" : "战后建议训练、休整、侦察敌情，等待士气恢复后再战。";

  const report: BattleReport = {
    id: battlefield.battleId,
    attackerFactionId: attackerCity.factionId,
    defenderFactionId: defenderCity.factionId,
    attackerCityName: attackerCity.name,
    defenderCityName: defenderCity.name,
    attackerGeneralId: commander?.generalId,
    defenderGeneralId: defender?.generalId,
    attackerGeneral: commander?.generalName ?? "我军主将",
    defenderGeneral: defender?.generalName ?? "守军主将",
    defenderTerrain: defenderCity.terrain,
    defenderDefense: defenderCity.defense,
    attackerStart: totalTroops(sentTroops),
    defenderStart: battlefield.enemyUnits.reduce((sum, unit) => sum + unit.maxTroops, 0),
    sortieTroops: sentTroops,
    garrisonTroops: pendingBattle.formation.garrisonTroops ?? emptyTroops,
    sortieTotal: totalTroops(sentTroops),
    garrisonTotal: pendingBattle.formation.garrisonTroops ? totalTroops(pendingBattle.formation.garrisonTroops) : 0,
    supplyCost,
    garrisonRisk: pendingBattle.formation.garrisonRisk,
    garrisonRiskLevel: pendingBattle.formation.garrisonRiskLevel,
    cityFatigueDelta: fatigueDelta,
    battleAftermath: result.summary,
    recoveryHint: attackerWins ? "新占城市需要安抚。" : "出征城市需要休整。",
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
    expMessages,
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
    advisorContribution: `军师与后军提供技能、稳军与战机支持。`,
    wingContributions: battlefield.playerUnits.filter((unit) => unit.role === "left" || unit.role === "right" || unit.role === "vanguard" || unit.role === "rear").map((unit) => `${unit.generalName}部：杀伤${unit.kills}，损失${unit.losses}，技能${unit.skillUses}次。`),
    commandScore: Math.max(40, Math.min(100, 60 + (attackerWins ? 18 : -8) + skillRecords.length * 3 - Math.floor(result.attackerLoss / Math.max(100, totalTroops(sentTroops) / 10)))),
    playerControlSummary: `玩家在战场中指挥${battlefield.playerUnits.length}支部队，执行${commandRecords.length}轮命令，释放${skillRecords.length}次主动技能。`,
    battleTitle: `${attackerCity.name}攻${defenderCity.name}之战`,
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

  const archiveEntry = {
    id: `archive-${report.id}`,
    turn: (nextState.year - 190) * 12 + nextState.month,
    title: report.battleTitle ?? `${report.attackerCityName}攻${report.defenderCityName}`,
    summary: report.battleSummary ?? report.resultText,
    highlights: [
      report.mvpText,
      ...(report.decisiveEvents ?? []).slice(0, 2),
      report.occupied ? `${report.defenderCityName}易主` : `${report.defenderCityName}守住城池`,
    ].filter(Boolean),
  };
  nextState = {
    ...nextState,
    lastBattle: report,
    enhancedWarArchive: [archiveEntry, ...(nextState.enhancedWarArchive ?? [])].slice(0, 80),
    longSimStats: {
      turnsSimulated: nextState.longSimStats?.turnsSimulated ?? 0,
      battles: (nextState.longSimStats?.battles ?? 0) + 1,
      events: nextState.longSimStats?.events ?? 0,
    },
  };
  return { state: nextState, report, logs: [`${report.battleTitle}：${report.battleSummary}`, ...skillRecords.slice(-5).map((record) => record.effect), ...expMessages.slice(-4)] };
};
