import { skillName } from "../data/skills";
import { areAdjacent } from "../data/routes";
import { createAutoFormation, getFormationGenerals, sumAssignedTroops } from "./armyFormationSystem";
import { createAutoTacticalChoices, summarizeTacticalEffects } from "./battleTacticsSystem";
import { applyExpToGeneral, getBestGeneral } from "./generalSystem";
import { counterBonus, scaleTroops, totalTroops, troopPower } from "./unitSystem";
import type { ArmyFormation, BattleControlMode, BattleReport, BattleTacticalChoice, City, GameState, General, Troops } from "../types";

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

const generalBattleBonus = (general?: General) =>
  general ? 1 + general.command / 260 + general.force / 420 + general.intelligence / 900 : 1;

const has = (general: General | undefined, skillId: string) => Boolean(general?.skills.includes(skillId));

const hasAny = (general: General | undefined, skillIds: string[]) => skillIds.some((skillId) => has(general, skillId));

const reportAdviceWin = (capacityPressure: number, lossRisk: number) => {
  if (capacityPressure > 0) return "虽已取胜，但带兵压力偏高，下次可减少出兵或换高统率武将压阵。";
  if (lossRisk > 2) return "胜利代价偏高，下次收束阶段可选择保守收兵或整备入城。";
  return "战术执行顺利，可趁敌军未稳继续侦察相邻城池。";
};

const reportAdviceLose = (capacityPressure: number, choices: BattleTacticalChoice[]) => {
  if (capacityPressure > 0) return "失败主因之一是带兵超限，建议调整主将/后军或改用稳守编成。";
  if (choices.some((choice) => choice.riskLevel === "高" && !choice.success)) return "高风险战术未奏效，建议下次先用试探和稳扎推进积累战机。";
  return "建议先训练士兵、侦察敌情，再以军师奇策或两翼合围寻找突破。";
};

const calculateFatigueDelta = (formation: ArmyFormation, attackerLossRate: number, attackerWins: boolean, tacticalChoices: BattleTacticalChoice[]) => {
  const sortieRatio = formation.sortieRatio ?? 0.5;
  const pursuitPressure = tacticalChoices.some((choice) => choice.choiceId === "pursuit") ? 6 : 0;
  const conservativeRelief = tacticalChoices.some((choice) => choice.choiceId === "conservative-withdraw" || choice.choiceId === "no-pursuit") ? -5 : 0;
  const scalePressure = sortieRatio >= 0.8 ? 10 : sortieRatio >= 0.68 ? 7 : sortieRatio >= 0.5 ? 4 : 2;
  const lossPressure = Math.round(attackerLossRate * 18);
  return Math.max(3, Math.min(32, scalePressure + lossPressure + pursuitPressure + conservativeRelief + (attackerWins ? 0 : 4)));
};

interface ResolveBattleOptions {
  formation?: ArmyFormation;
  tacticalChoices?: BattleTacticalChoice[];
  controlMode?: BattleControlMode;
}

const getGeneralById = (state: GameState, id?: string) => state.generals.find((general) => general.id === id);

// 自动战斗核心结算，返回更新后的状态与战报。
export const resolveBattle = (state: GameState, attackerCityId: string, defenderCityId: string, options: ResolveBattleOptions = {}) => {
  const attackerCity = state.cities.find((city) => city.id === attackerCityId);
  const defenderCity = state.cities.find((city) => city.id === defenderCityId);
  if (!attackerCity || !defenderCity || attackerCity.factionId === defenderCity.factionId) {
    return { state, report: undefined, logs: ["出征目标无效"] };
  }
  if (!areAdjacent(attackerCityId, defenderCityId)) {
    return { state, report: undefined, logs: ["只能攻击相邻城市"] };
  }
  const formation = options.formation ?? createAutoFormation(state, attackerCityId, defenderCityId);
  const formationGenerals = getFormationGenerals(state, formation);
  const attackerGeneral = formationGenerals.commander ?? getBestGeneral(state, attackerCityId, "battle");
  const advisorGeneral = formationGenerals.advisor;
  const defenderGeneral = getBestGeneral(state, defenderCityId, "battle");
  const assignedTroops = sumAssignedTroops(formation);
  const sentTroops = totalTroops(formation.sortieTroops ?? emptyTroops) > 0
    ? formation.sortieTroops!
    : totalTroops(assignedTroops) > 0
      ? assignedTroops
      : scaleTroops(attackerCity.troops, 0.55);
  const attackerStart = totalTroops(sentTroops);
  const defenderStart = totalTroops(defenderCity.troops);
  if (attackerStart < 200) return { state, report: undefined, logs: ["兵力不足，无法出征"] };
  const tacticalChoices =
    options.tacticalChoices && options.tacticalChoices.length > 0
      ? options.tacticalChoices
      : createAutoTacticalChoices(state, attackerCityId, defenderCityId, formation, options.controlMode === "auto" ? "auto" : "ai", options.controlMode ?? "standard");
  const tacticalEffects = summarizeTacticalEffects(tacticalChoices);

  const skillMessages: string[] = [];
  let attackerPower =
    troopPower(sentTroops, defenderCity.terrain, state.currentWeather) *
    counterBonus(sentTroops, defenderCity.troops) *
    generalBattleBonus(attackerGeneral) *
    (1 + attackerCity.morale / 260);
  let defenderPower =
    troopPower(defenderCity.troops, defenderCity.terrain, state.currentWeather) *
    counterBonus(defenderCity.troops, sentTroops) *
    generalBattleBonus(defenderGeneral) *
    (1 + defenderCity.morale / 240) *
    (1 + defenderCity.defense / 250) *
    (defenderCity.terrain === "city" ? 1.15 : 1);

  if (advisorGeneral) {
    attackerPower *= 1 + advisorGeneral.intelligence / 1100 + advisorGeneral.command / 1800;
    skillMessages.push(`${advisorGeneral.name}担任军师，提升战机判断与阵势调度`);
  }
  if (formation.capacityPressure > 0) {
    attackerPower *= 1 - formation.capacityPressure;
    skillMessages.push(`军团带兵压力偏高，部分部队超过统率上限，战斗效率下降`);
  }
  if (tacticalChoices.length > 0) {
    const tacticalMultiplier =
      1 +
      tacticalEffects.momentum * 0.035 +
      tacticalEffects.opportunity * 0.03 +
      tacticalEffects.breakthrough * 0.045 +
      tacticalEffects.morale * 0.018 +
      (tacticalEffects.pressure ?? 0) * 0.012;
    attackerPower *= Math.max(0.82, tacticalMultiplier);
    if ((tacticalEffects.enemyMomentum ?? 0) < 0) defenderPower *= Math.max(0.82, 1 + (tacticalEffects.enemyMomentum ?? 0) * 0.025);
    skillMessages.push(...tacticalChoices.map((choice) => choice.description));
  }

  if (has(attackerGeneral, "command")) {
    attackerPower *= 1.1;
    skillMessages.push(`${attackerGeneral?.name}发动【${skillName("command")}】，全军战斗力提升`);
  }
  if (has(defenderGeneral, "command")) {
    defenderPower *= 1.1;
    skillMessages.push(`${defenderGeneral?.name}发动【${skillName("command")}】，守军战斗力提升`);
  }
  if (has(defenderGeneral, "hold")) {
    defenderPower *= 1.2;
    skillMessages.push(`${defenderGeneral?.name}发动【${skillName("hold")}】，城防稳固`);
  }
  if (has(attackerGeneral, "charge")) {
    attackerPower *= 1.2;
    skillMessages.push(`${attackerGeneral?.name}发动【${skillName("charge")}】，冲阵杀伤提高`);
  }
  if (has(attackerGeneral, "inspire")) {
    attackerPower *= 1.08;
    skillMessages.push(`${attackerGeneral?.name}发动【${skillName("inspire")}】，士气上升`);
  }
  if (has(defenderGeneral, "inspire")) {
    defenderPower *= 1.08;
    skillMessages.push(`${defenderGeneral?.name}发动【${skillName("inspire")}】，守军士气上升`);
  }
  if (has(attackerGeneral, "ambush")) {
    attackerPower *= state.currentWeather === "fog" ? 1.18 : 1.09;
    skillMessages.push(`${attackerGeneral?.name}发动【${skillName("ambush")}】，${state.currentWeather === "fog" ? "雾中伏兵奇效" : "开战突袭"}`);
  }
  if (has(defenderGeneral, "ambush")) {
    defenderPower *= state.currentWeather === "fog" ? 1.16 : 1.08;
    skillMessages.push(`${defenderGeneral?.name}发动【${skillName("ambush")}】，伏兵截击`);
  }
  if (has(attackerGeneral, "fire")) {
    attackerPower *= state.currentWeather === "rain" ? 1.04 : 1.12;
    skillMessages.push(`${attackerGeneral?.name}发动【${skillName("fire")}】，${state.currentWeather === "rain" ? "雨天火势受限" : "烈焰冲阵"}`);
  }
  if (has(defenderGeneral, "fire")) {
    defenderPower *= state.currentWeather === "rain" ? 1.04 : 1.1;
    skillMessages.push(`${defenderGeneral?.name}发动【${skillName("fire")}】，火势扰敌`);
  }
  if (has(attackerGeneral, "hegemony")) {
    attackerPower *= 1.1;
    skillMessages.push(`${attackerGeneral?.name}以【${skillName("hegemony")}】统合军势，中原霸主之气压阵`);
  }
  if (has(attackerGeneral, "benevolence")) {
    attackerPower *= 1.06;
    skillMessages.push(`${attackerGeneral?.name}以【${skillName("benevolence")}】聚拢人心，军心更稳`);
  }
  if (hasAny(attackerGeneral, ["jiangdong", "naval"]) && defenderCity.terrain === "river") {
    attackerPower *= has(attackerGeneral, "jiangdong") ? 1.16 : 1.12;
    skillMessages.push(`${attackerGeneral?.name}发挥【${has(attackerGeneral, "jiangdong") ? skillName("jiangdong") : skillName("naval")}】，江河作战更显优势`);
  }
  if (hasAny(defenderGeneral, ["jiangdong", "naval"]) && defenderCity.terrain === "river") {
    defenderPower *= has(defenderGeneral, "jiangdong") ? 1.16 : 1.12;
    skillMessages.push(`${defenderGeneral?.name}发挥【${has(defenderGeneral, "jiangdong") ? skillName("jiangdong") : skillName("naval")}】，守住水网阵势`);
  }
  if (has(attackerGeneral, "gentry")) {
    attackerPower *= 1.06;
    skillMessages.push(`${attackerGeneral?.name}凭【${skillName("gentry")}】声望号令军伍`);
  }
  if (has(attackerGeneral, "tyranny")) {
    attackerPower *= 1.08;
    skillMessages.push(`${attackerGeneral?.name}施展【${skillName("tyranny")}】，以强权驱兵压境`);
  }
  if (has(attackerGeneral, "pressure")) {
    defenderPower *= 0.94;
    skillMessages.push(`${attackerGeneral?.name}释放【${skillName("pressure")}】，敌军阵脚受挫`);
  }
  if (has(defenderGeneral, "pressure")) {
    attackerPower *= 0.94;
    skillMessages.push(`${defenderGeneral?.name}以【${skillName("pressure")}】震慑来敌`);
  }
  if (has(attackerGeneral, "breakArmy")) {
    attackerPower *= 1.14;
    skillMessages.push(`${attackerGeneral?.name}发动【${skillName("breakArmy")}】，强行撕开敌阵`);
  }
  if (has(defenderGeneral, "breakArmy")) {
    defenderPower *= 1.08;
    skillMessages.push(`${defenderGeneral?.name}以【${skillName("breakArmy")}】反冲敌阵`);
  }
  if (has(attackerGeneral, "prowess")) {
    attackerPower *= 1.22;
    skillMessages.push(`${attackerGeneral?.name}展现【${skillName("prowess")}】，战场锋芒无人敢当`);
  }
  if (has(defenderGeneral, "prowess")) {
    defenderPower *= 1.18;
    skillMessages.push(`${defenderGeneral?.name}凭【${skillName("prowess")}】镇住阵线`);
  }
  if (has(attackerGeneral, "swift")) {
    attackerPower *= 1.1;
    skillMessages.push(`${attackerGeneral?.name}发动【${skillName("swift")}】，精锐突击更快抵近`);
  }
  if (has(attackerGeneral, "cavalryMaster") && sentTroops.cavalry > 0) {
    attackerPower *= 1.12;
    skillMessages.push(`${attackerGeneral?.name}统率【${skillName("cavalryMaster")}】，骑兵冲击增强`);
  }
  if (has(attackerGeneral, "roar")) {
    attackerPower *= 1.12;
    skillMessages.push(`${attackerGeneral?.name}怒发【${skillName("roar")}】，敌胆震动`);
  }
  if (has(attackerGeneral, "strategy")) {
    attackerPower *= 1.14;
    skillMessages.push(`${attackerGeneral?.name}施展【${skillName("strategy")}】，抢得战机`);
  }
  if (has(defenderGeneral, "strategy")) {
    defenderPower *= 1.14;
    skillMessages.push(`${defenderGeneral?.name}以【${skillName("strategy")}】稳住全局`);
  }
  if (has(attackerGeneral, "assist")) {
    attackerPower *= 1.08;
    skillMessages.push(`${attackerGeneral?.name}献上【${skillName("assist")}】，军势调度更顺`);
  }
  if (has(defenderGeneral, "assist")) {
    defenderPower *= 1.08;
    skillMessages.push(`${defenderGeneral?.name}凭【${skillName("assist")}】调度守势`);
  }
  if (has(defenderGeneral, "counter")) {
    defenderPower *= 1.16;
    skillMessages.push(`${defenderGeneral?.name}发动【${skillName("counter")}】，后发制人`);
  }
  if (has(attackerGeneral, "lure")) {
    attackerPower *= 1.09;
    skillMessages.push(`${attackerGeneral?.name}布下【${skillName("lure")}】，诱敌露出破绽`);
  }
  if (has(defenderGeneral, "lure")) {
    defenderPower *= 1.09;
    skillMessages.push(`${defenderGeneral?.name}以【${skillName("lure")}】牵制敌军节奏`);
  }
  if (has(defenderGeneral, "guard")) {
    defenderPower *= 1.13;
    skillMessages.push(`${defenderGeneral?.name}施展【${skillName("guard")}】，护住中军不乱`);
  }
  if (has(attackerGeneral, "guard")) {
    attackerPower *= 1.06;
    skillMessages.push(`${attackerGeneral?.name}以【${skillName("guard")}】护持阵心，突击更稳`);
  }
  if (has(attackerGeneral, "duel") && Math.random() < 0.45) {
    attackerPower *= 1.15;
    skillMessages.push(`${attackerGeneral?.name}单挑爆发，敌军阵脚大乱`);
  }
  if (has(defenderGeneral, "duel") && Math.random() < 0.35) {
    defenderPower *= 1.12;
    skillMessages.push(`${defenderGeneral?.name}单挑迎击，守军士气大振`);
  }

  const totalPower = Math.max(1, attackerPower + defenderPower);
  const attackerRatio = attackerPower / totalPower;
  const attackerWins = attackerRatio > 0.5 + (Math.random() - 0.5) * 0.16;
  const tacticalLossAdjust = tacticalEffects.lossRisk * 0.025 - tacticalEffects.morale * 0.008;
  const tacticalBreakAdjust = tacticalEffects.breakthrough * 0.018 + tacticalEffects.opportunity * 0.01;
  const defenderLossRate = Math.min(0.92, Math.max(0.18, attackerRatio * (attackerWins ? 0.9 : 0.62) + tacticalBreakAdjust));
  const attackerLossRate = Math.min(0.9, Math.max(0.16, (1 - attackerRatio) * (attackerWins ? 0.58 : 0.86) + tacticalLossAdjust));
  const fatigueDelta = calculateFatigueDelta(formation, attackerLossRate, attackerWins, tacticalChoices);
  const supplyCost = Math.min(attackerCity.food, formation.supplyCost ?? Math.ceil(attackerStart * 0.14));
  const attackerLossTroops = scaleTroops(sentTroops, attackerLossRate);
  const defenderLossTroops = scaleTroops(defenderCity.troops, defenderLossRate);
  const attackerRemainingTroops = subtractTroops(sentTroops, attackerLossTroops);
  const defenderRemainingTroops = subtractTroops(defenderCity.troops, defenderLossTroops);
  const attackerLoss = totalTroops(attackerLossTroops);
  const defenderLoss = totalTroops(defenderLossTroops);
  const attackerRemaining = totalTroops(attackerRemainingTroops);
  const defenderRemaining = totalTroops(defenderRemainingTroops);

  let nextCities: City[];
  let nextGenerals = state.generals;
  const attackingGeneralIds = Array.from(
    new Set([
      formation.commanderId,
      formation.advisorId,
      formation.vanguardGeneralId,
      formation.leftGeneralId,
      formation.rightGeneralId,
      formation.reserveGeneralId,
      attackerGeneral?.id,
    ].filter((id): id is string => Boolean(id))),
  );
  if (attackerWins) {
    nextCities = state.cities.map((city) => {
      if (city.id === attackerCityId) {
        return {
          ...city,
          troops: subtractTroops(city.troops, sentTroops),
          food: Math.max(0, city.food - supplyCost),
          generals: city.generals.filter((id) => !attackingGeneralIds.includes(id)),
          morale: Math.max(45, city.morale - 4),
          cityFatigue: Math.min(100, (city.cityFatigue ?? 0) + fatigueDelta),
          recoveryHint: formation.garrisonRiskLevel === "high" ? "留守偏低且主力远出，建议下回合征兵或训练补防。" : "主力已出征，建议根据战况安排休整。",
          actedThisTurn: true,
        };
      }
      if (city.id === defenderCityId) {
        return {
          ...city,
          factionId: attackerCity.factionId,
          troops: attackerRemainingTroops,
          generals: attackingGeneralIds,
          gold: Math.floor(city.gold * 0.75),
          food: Math.floor(city.food * 0.75),
          morale: Math.max(45, Math.min(88, attackerCity.morale - 5)),
          publicOrder: Math.max(25, city.publicOrder - 12),
          cityFatigue: Math.min(100, (city.cityFatigue ?? 0) + Math.max(6, Math.floor(fatigueDelta / 2))),
          recoveryHint: "新占城市需要安抚和整备，避免民心继续下滑。",
          actedThisTurn: true,
        };
      }
      return city;
    });
    const capturedIds = defenderCity.generals;
    nextGenerals = nextGenerals.map((general) => {
      if (attackingGeneralIds.includes(general.id)) return { ...general, locationCityId: defenderCityId };
      if (capturedIds.includes(general.id)) return { ...general, factionId: "independent", status: "wild" as const, loyalty: 50, locationCityId: defenderCityId };
      return general;
    });
  } else {
    nextCities = state.cities.map((city) => {
      if (city.id === attackerCityId) {
        return {
          ...city,
          troops: addTroops(subtractTroops(city.troops, sentTroops), attackerRemainingTroops),
          food: Math.max(0, city.food - supplyCost),
          morale: Math.max(30, city.morale - 8),
          cityFatigue: Math.min(100, (city.cityFatigue ?? 0) + fatigueDelta + (formation.garrisonRiskLevel === "high" ? 8 : 0)),
          recoveryHint: formation.garrisonRiskLevel === "high" ? "出征失败且留守偏低，建议立刻训练、征兵或休整。" : "出征失败后疲劳上升，建议休整恢复。",
          actedThisTurn: true,
        };
      }
      if (city.id === defenderCityId) {
        return {
          ...city,
          troops: defenderRemainingTroops,
          morale: Math.min(100, city.morale + 4),
          publicOrder: Math.max(35, city.publicOrder - 5),
          cityFatigue: Math.min(100, (city.cityFatigue ?? 0) + 4),
          recoveryHint: "守城成功但城内仍需恢复秩序。",
        };
      }
      return city;
    });
  }

  let nextState: GameState = { ...state, cities: nextCities, generals: nextGenerals };
  const expMessages: string[] = [];
  if (attackerGeneral) {
    const exp = applyExpToGeneral(nextState, attackerGeneral.id, attackerWins ? 30 : 10);
    nextState = exp.state;
    expMessages.push(`${attackerGeneral.name}获得${attackerWins ? 30 : 10}经验`, ...exp.logs);
  }
  if (advisorGeneral && advisorGeneral.id !== attackerGeneral?.id) {
    const exp = applyExpToGeneral(nextState, advisorGeneral.id, attackerWins ? 20 : 8);
    nextState = exp.state;
    expMessages.push(`${advisorGeneral.name}获得${attackerWins ? 20 : 8}经验`, ...exp.logs);
  }
  if (defenderGeneral) {
    const exp = applyExpToGeneral(nextState, defenderGeneral.id, attackerWins ? 10 : 30);
    nextState = exp.state;
    expMessages.push(`${defenderGeneral.name}获得${attackerWins ? 10 : 30}经验`, ...exp.logs);
  }
  const commandScore = Math.max(
    35,
    Math.min(
      100,
      Math.round(55 + attackerRatio * 35 + tacticalChoices.filter((choice) => choice.success).length * 5 - formation.capacityPressure * 40),
    ),
  );
  const commandGrade = commandScore >= 88 ? "S" : commandScore >= 74 ? "A" : commandScore >= 58 ? "B" : "C";
  const battleTimeline = tacticalChoices.map(
    (choice) => `${choice.success ? "成功" : "受挫"}：${choice.description}（影响：${choice.actualEffects ?? choice.predictedEffects ?? "战局发生变化"}）`,
  );
  const comboMessages = tacticalChoices.map((choice) => choice.comboHint).filter((item): item is string => Boolean(item));
  const counterMessages = tacticalChoices.map((choice) => choice.counterHint).filter((item): item is string => Boolean(item));
  const decisiveEvents = tacticalChoices.map((choice) => choice.decisiveEvent).filter((item): item is string => Boolean(item)).slice(0, 2);
  const keyFactors = [
    `出征/留守：出征${attackerStart.toLocaleString()}，留守${(formation.garrisonTroops ? totalTroops(formation.garrisonTroops) : 0).toLocaleString()}，粮草消耗${supplyCost}。`,
    `战略后果：城市疲劳 +${fatigueDelta}，${formation.garrisonRisk ?? "留守风险可控"}`,
    `军团评分：${formation.scores?.rating ?? "B"}，${formation.scores?.advice ?? "编成影响战斗稳定性。"}`,
    `战术收益：军势${tacticalEffects.momentum >= 0 ? "+" : ""}${tacticalEffects.momentum}、战机+${tacticalEffects.opportunity}、破阵+${tacticalEffects.breakthrough}、损失风险${tacticalEffects.lossRisk >= 0 ? "+" : ""}${tacticalEffects.lossRisk}`,
    formation.capacityPressure > 0 ? "部分武将带兵超限，降低了战斗效率。" : "带兵未明显超限，阵线较稳定。",
  ];
  const nextAdvice = attackerWins
    ? reportAdviceWin(formation.capacityPressure, tacticalEffects.lossRisk)
    : reportAdviceLose(formation.capacityPressure, tacticalChoices);

  const report: BattleReport = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    attackerFactionId: attackerCity.factionId,
    defenderFactionId: defenderCity.factionId,
    attackerCityName: attackerCity.name,
    defenderCityName: defenderCity.name,
    attackerGeneralId: attackerGeneral?.id,
    defenderGeneralId: defenderGeneral?.id,
    attackerGeneral: attackerGeneral?.name ?? "无名将",
    defenderGeneral: defenderGeneral?.name ?? "守城校尉",
    defenderTerrain: defenderCity.terrain,
    defenderDefense: defenderCity.defense,
    attackerStart,
    defenderStart,
    sortieTroops: sentTroops,
    garrisonTroops: formation.garrisonTroops,
    sortieTotal: attackerStart,
    garrisonTotal: formation.garrisonTroops ? totalTroops(formation.garrisonTroops) : Math.max(0, totalTroops(attackerCity.troops) - attackerStart),
    supplyCost,
    garrisonRisk: formation.garrisonRisk,
    garrisonRiskLevel: formation.garrisonRiskLevel,
    cityFatigueDelta: fatigueDelta,
    battleAftermath: attackerWins
      ? `战后疲劳 +${fatigueDelta}，消耗粮草 ${supplyCost}，${formation.garrisonRisk ?? "留守风险可控"}`
      : `战败疲劳 +${fatigueDelta}${formation.garrisonRiskLevel === "high" ? "，留守偏低导致后方压力上升" : ""}，消耗粮草 ${supplyCost}`,
    recoveryHint: attackerWins ? "胜利后可继续推进，但建议关注新占城市民心与出发城疲劳。" : "战败后建议优先训练、休整或补充城防。",
    attackerLoss,
    defenderLoss,
    attackerRemaining,
    defenderRemaining,
    attackerMorale: attackerCity.morale,
    defenderMorale: defenderCity.morale,
    winner: attackerWins ? "attacker" : "defender",
    occupied: attackerWins,
    skillMessages,
    resultText: attackerWins ? `${attackerCity.name}军攻克${defenderCity.name}` : `${attackerCity.name}军进攻${defenderCity.name}失利`,
    mvpText: attackerWins
      ? `${attackerGeneral?.name ?? "进攻主将"}掌握战机，成为此战关键。`
      : `${defenderGeneral?.name ?? "守城校尉"}稳住阵线，守住了${defenderCity.name}。`,
    expMessages,
    armyFormation: formation,
    tacticalChoices,
    commanderContribution: `${attackerGeneral?.name ?? "主将"}统合${attackerStart.toLocaleString()}兵，${attackerWins ? "推动攻势成形" : "在逆势中保全余部"}。`,
    advisorContribution: advisorGeneral
      ? `${advisorGeneral.name}参赞军议，战术收益影响军势、战机与破阵。`
      : "本战缺少军师，计策和战机掌控较弱。",
    wingContributions: [
      formationGenerals.vanguard ? `先锋${formationGenerals.vanguard.name}负责接敌突破。` : "先锋未成独立编队。",
      formationGenerals.left ? `左翼${formationGenerals.left.name}牵制侧线。` : "左翼兵力由中军兼顾。",
      formationGenerals.right ? `右翼${formationGenerals.right.name}保持机动。` : "右翼兵力由中军兼顾。",
    ],
    battleTimeline,
    keyFactors,
    nextAdvice,
    commandGrade,
    commandScore,
    playerControlSummary:
      tacticalChoices.length > 0
        ? `本战执行${tacticalChoices.map((choice) => `【${choice.label}】`).join("、")}，${tacticalChoices.some((choice) => choice.success) ? "成功制造战机" : "效果有限但仍影响战损"}。`
        : "本战按默认指令快速结算。",
    battleTitle: `${attackerCity.name}攻${defenderCity.name}之战`,
    battleSummary: attackerWins
      ? `${attackerGeneral?.name ?? "进攻主将"}率军突破${defenderCity.name}防线，${decisiveEvents[0] ? `关键在于${decisiveEvents[0]}。` : "攻势最终压倒守军。"}`
      : `${defenderGeneral?.name ?? "守城校尉"}守住${defenderCity.name}，进攻军被迫退回整备。`,
    historicalNarrative: attackerWins
      ? `此战自${attackerCity.name}发兵，留守${formation.garrisonTroops ? totalTroops(formation.garrisonTroops).toLocaleString() : "若干"}，以${formation.scores?.rating ?? "B"}级编成推进。战后${defenderCity.name}易帜，但出发城疲劳上升，需要处理后续治理。`
      : `此战虽已完成军议编成，但${defenderCity.name}城防与守军发挥抵消了攻势。撤军后应训练、休整或等待更合适的天气与战机。`,
    tacticStory: battleTimeline,
    comboMessages,
    counterMessages,
    decisiveEvents,
  };
  nextState = { ...nextState, lastBattle: report };
  return { state: nextState, report, logs: [report.resultText, ...skillMessages, ...expMessages] };
};

export const zeroTroops = emptyTroops;
