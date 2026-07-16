import { getAttackTargets, performCityAction } from "../src/systems/citySystem";
import { actionLabels, getCommandCost, spendPlayerCommand } from "../src/systems/commandSystem";
import { createAutoFormation } from "../src/systems/armyFormationSystem";
import { createAutoTacticalChoices } from "../src/systems/battleTacticsSystem";
import { resolveBattle } from "../src/systems/battleSystem";
import { createBattlefieldState, sumUnitTroops } from "../src/systems/battlefieldSystem";
import { applyBattlefieldResult } from "../src/systems/battleResolutionSystem";
import { issueBattleCommand, executeBattleRound } from "../src/systems/unitCommandSystem";
import { getUnitActiveSkills } from "../src/systems/activeSkillSystem";
import { createInitialGame } from "../src/systems/scenarioSystem";
import { endTurn } from "../src/systems/turnSystem";
import { totalTroops } from "../src/systems/unitSystem";
import { applyPostBattleSettlement } from "../src/systems/postBattleSettlementSystem";
import { transferGenerals } from "../src/systems/transferSystem";
import { getActiveGeneralsAtCity } from "../src/selectors/generalSelectors";
import { loadGame, saveGame } from "../src/systems/saveSystem";
import type { GameState } from "../src/types";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const assertHealthy = (state: GameState) => {
  assert((state.commandState.commands ?? 0) >= 0, "unified commands below zero");
  assert((state.commandState.maxCommands ?? 0) >= 1, "unified command cap invalid");
  assert(state.commandState.politicalOrders >= 0, "政令为负");
  assert(state.commandState.militaryOrders >= 0, "军令为负");
  for (const city of state.cities) {
    assert(Number.isFinite(city.gold) && city.gold >= 0, `${city.name} 金钱非法`);
    assert(Number.isFinite(city.food) && city.food >= 0, `${city.name} 粮草非法`);
    assert(totalTroops(city.troops) >= 0, `${city.name} 兵力非法`);
    assert((city.cityFatigue ?? 0) >= 0, `${city.name} 疲劳非法`);
  }
  const cityIds = new Set(state.cities.map((city) => city.id));
  const seen = new Set<string>();
  for (const general of state.generals.filter((item) => item.status === "active")) {
    assert(cityIds.has(general.locationCityId), `${general.name} 缺少合法 locationCityId`);
    assert(!seen.has(general.id), `${general.name} 在派生武将列表中重复`);
    seen.add(general.id);
  }
  const derivedIds = state.cities.flatMap((city) => getActiveGeneralsAtCity(state, city.id).map((general) => general.id));
  assert(new Set(derivedIds).size === derivedIds.length, "城市派生武将列表存在重复");
};

let state = createInitialGame("cao-cao");
assertHealthy(state);

const liuStart = createInitialGame("liu-bei", "190");
assert((liuStart.commandState.maxCommands ?? 0) >= 3, "190 liu-bei starts with fewer than 3 commands");
assert(liuStart.factionUniqueMechanics?.["liu-bei"], "liu-bei faction mechanic missing");
assert(liuStart.seasonState && liuStart.weatherState, "season/weather state missing");
assert(liuStart.citySpecialties?.length, "city specialties missing");
assert(liuStart.encyclopediaSeenState, "encyclopedia state missing");

const politicalCity = state.cities.find((city) => city.factionId === state.playerFactionId && !city.actedThisTurn && city.gold >= 100);
const beforePoliticalCommand = state.commandState.commands ?? 0;
assert(politicalCity, "找不到可执行政令的城市");
let spent = spendPlayerCommand(state, getCommandCost("agriculture"), actionLabels.agriculture, politicalCity!.name);
assert((spent.state.commandState.commands ?? 0) === beforePoliticalCommand - 1, "agriculture did not spend exactly 1 command");
assert(spent.ok, "政令行动消耗失败");
let result = performCityAction(spent.state, politicalCity!.id, "agriculture");
state = result.state;
assertHealthy(state);

const militaryCity = state.cities.find((city) => city.factionId === state.playerFactionId && !city.actedThisTurn && city.gold >= 120 && city.food >= 120);
const beforeMilitaryCommand = state.commandState.commands ?? 0;
assert(militaryCity, "找不到可执行军令的城市");
spent = spendPlayerCommand(state, getCommandCost("recruit"), actionLabels.recruit, militaryCity!.name);
assert((spent.state.commandState.commands ?? 0) === beforeMilitaryCommand - 1, "recruit did not spend exactly 1 command");
assert(spent.ok, "军令行动消耗失败");
result = performCityAction(spent.state, militaryCity!.id, "recruit");
state = result.state;
assertHealthy(state);

let battleState = createInitialGame("cao-cao");
const attacker = battleState.cities.find((city) => city.factionId === battleState.playerFactionId && !city.actedThisTurn && getAttackTargets(battleState, city.id).length > 0);
assert(attacker, "找不到可模拟战前军议的城市");
const defender = getAttackTargets(battleState, attacker!.id)[0];
const formation = createAutoFormation(battleState, attacker!.id, defender.id, "auto", "balanced", {}, { sortiePreset: "standard", garrisonPreset: "30" });
assert(formation.totalTroops >= 200, "军团编成兵力不足");
assert(formation.garrisonTroops && totalTroops(formation.garrisonTroops) >= (formation.minimumGarrison ?? 0), "留守兵力低于最低守备");
const tactics = createAutoTacticalChoices(battleState, attacker!.id, defender.id, formation, "auto", "standard");
const battle = resolveBattle(battleState, attacker!.id, defender.id, { formation, tacticalChoices: tactics, controlMode: "auto" });
assert(battle.report, "战斗未生成战报");
battleState = battle.state;
assertHealthy(battleState);

let classicBattleState = createInitialGame("cao-cao");
const classicAttacker = classicBattleState.cities.find((city) => city.factionId === classicBattleState.playerFactionId && !city.actedThisTurn && getAttackTargets(classicBattleState, city.id).length > 0);
assert(classicAttacker, "找不到可模拟经典战场的城市");
const classicDefender = getAttackTargets(classicBattleState, classicAttacker!.id)[0];
const classicFormation = createAutoFormation(classicBattleState, classicAttacker!.id, classicDefender.id, "auto", "balanced", {}, { sortiePreset: "standard", garrisonPreset: "30" });
let battlefield = createBattlefieldState(classicBattleState, { attackerCityId: classicAttacker!.id, defenderCityId: classicDefender.id, formation: classicFormation, controlMode: "classic" }, "classic");
assert(battlefield.playerUnits.length >= 3, "经典战场我方可控部队不足 3 支");
const firstUnit = battlefield.playerUnits[0];
const firstTarget = battlefield.enemyUnits[0];
const firstSkill = getUnitActiveSkills(classicBattleState, firstUnit)[0];
battlefield = issueBattleCommand(battlefield, { unitId: firstUnit.id, commandType: firstSkill ? "skill" : "attack", targetUnitId: firstTarget.id, skillId: firstSkill?.id, issuedBy: "player" });
battlefield = executeBattleRound(classicBattleState, battlefield);
assert(battlefield.round >= 2, "经典战场回合未推进");
while (!battlefield.result && battlefield.round <= battlefield.maxRounds + 1) battlefield = executeBattleRound(classicBattleState, battlefield);
assert(battlefield.result, "经典战场未生成结果");
const appliedBattlefield = applyBattlefieldResult(classicBattleState, { attackerCityId: classicAttacker!.id, defenderCityId: classicDefender.id, formation: classicFormation, controlMode: "classic" }, battlefield);
assert(appliedBattlefield.report?.unitResults?.length, "经典战场未写入部队表现");
classicBattleState = appliedBattlefield.state;
assertHealthy(classicBattleState);

let liuBattleState = createInitialGame("liu-bei", "190");
const liuCity = liuBattleState.cities.find((city) => city.factionId === "liu-bei");
assert(liuCity, "找不到刘备开局城市");
const liuTarget = getAttackTargets(liuBattleState, liuCity!.id)[0];
assert(liuTarget, "找不到刘备可测试战斗目标");
const liuFormation = createAutoFormation(
  liuBattleState,
  liuCity!.id,
  liuTarget.id,
  "steady",
  "balanced",
  { includedGeneralIds: ["liu-bei", "guan-yu", "zhang-fei"] },
  { sortiePreset: "probe", garrisonPreset: "50" },
);
let liuField = createBattlefieldState(liuBattleState, { attackerCityId: liuCity!.id, defenderCityId: liuTarget.id, formation: liuFormation, controlMode: "classic" }, "classic");
const skillUnits = liuField.playerUnits.slice(0, 3);
assert(skillUnits.length >= 3, "刘备军未生成至少 3 支可控单位");
for (const unit of skillUnits) {
  const skill = getUnitActiveSkills(liuBattleState, unit)[0];
  assert(skill, `${unit.generalName}没有可用主动技能`);
  liuField = issueBattleCommand(liuField, { unitId: unit.id, commandType: "skill", targetUnitId: liuField.enemyUnits[0]?.id, skillId: skill.id, issuedBy: "player" });
}
liuField = executeBattleRound(liuBattleState, liuField);
assert(liuField.battleLog.some((line) => line.includes("发动【")), "刘关张主动技能没有写入战场日志");
assertHealthy(liuBattleState);

// 强制构造可重复的占城结果，验证战斗与战后武将去向严格分离。
const chenliu = liuBattleState.cities.find((city) => city.id === "chenliu");
assert(chenliu, "找不到陈留");
const closureFormation = createAutoFormation(
  liuBattleState,
  liuCity!.id,
  chenliu!.id,
  "auto",
  "balanced",
  { includedGeneralIds: ["liu-bei", "guan-yu", "zhang-fei"] },
  { sortiePreset: "main", garrisonPreset: "30" },
);
let closureField = createBattlefieldState(liuBattleState, { attackerCityId: liuCity!.id, defenderCityId: chenliu!.id, formation: closureFormation, controlMode: "classic" }, "classic");
const attackerRemainingTroops = sumUnitTroops(closureField.playerUnits);
const defenderStart = closureField.enemyUnits.reduce((sum, unit) => sum + unit.maxTroops, 0);
closureField = {
  ...closureField,
  enemyUnits: closureField.enemyUnits.map((unit) => ({ ...unit, troops: 0, isRouted: true })),
  result: {
    winner: "attacker",
    outcome: "victory",
    occupied: true,
    unitResults: [...closureField.playerUnits, ...closureField.enemyUnits].map((unit) => ({
      unitId: unit.id,
      generalName: unit.generalName,
      role: unit.role,
      startTroops: unit.maxTroops,
      remainingTroops: unit.side === "enemy" ? 0 : unit.troops,
      losses: unit.side === "enemy" ? unit.maxTroops : unit.losses,
      kills: unit.kills,
      skillUses: unit.skillUses,
      routed: unit.side === "enemy" || unit.isRouted,
    })),
    skillRecords: [],
    commandRecords: [],
    cityChanges: [],
    experienceGains: [],
    summary: "P0 闭环强制胜利",
    nextAdvice: "执行占城处置",
    attackerRemaining: totalTroops(attackerRemainingTroops),
    defenderRemaining: 0,
    attackerLoss: Math.max(0, closureFormation.totalTroops - totalTroops(attackerRemainingTroops)),
    defenderLoss: defenderStart,
    cityDefenseDamage: chenliu!.defense,
  },
};
const closureApplied = applyBattlefieldResult(
  liuBattleState,
  { attackerCityId: liuCity!.id, defenderCityId: chenliu!.id, formation: closureFormation, controlMode: "classic" },
  closureField,
);
assert(closureApplied.outcome?.conquered, "强制胜利未生成 BattleOutcome");
assert(closureApplied.state.pendingPostBattleSettlement, "占城后未生成 pendingPostBattleSettlement");
for (const id of ["liu-bei", "guan-yu", "zhang-fei"]) {
  assert(closureApplied.state.generals.find((general) => general.id === id)?.locationCityId === liuCity!.id, "settlement 前参战武将被提前搬入目标城");
}
const settled = applyPostBattleSettlement(closureApplied.state, {
  mode: "splitGarrison",
  garrisonGeneralIds: ["guan-yu"],
  returnGeneralIds: ["liu-bei", "zhang-fei"],
});
assert(settled.ok, `分兵驻守失败：${settled.reason ?? "未知"}`);
assert(!settled.state.pendingPostBattleSettlement, "settlement 完成后 pending 未清空");
assert(getActiveGeneralsAtCity(settled.state, chenliu!.id).map((general) => general.id).join(",") === "guan-yu", "陈留驻守武将不正确");
assert(new Set(getActiveGeneralsAtCity(settled.state, liuCity!.id).map((general) => general.id)).size === 2, "平原回师武将数量不正确");
const beforeTransferCommands = settled.state.commandState.commands ?? 0;
const transferred = transferGenerals(settled.state, {
  sourceCityId: chenliu!.id,
  targetCityId: liuCity!.id,
  generalIds: ["guan-yu"],
  troopsByGeneral: { "guan-yu": { infantry: 0, cavalry: 0, archer: 0, navy: 0 } },
});
assert(transferred.ok, `城市调遣失败：${transferred.reason ?? "未知"}`);
assert((transferred.state.commandState.commands ?? 0) === beforeTransferCommands - 1, "调遣没有扣除 1 指令");
assert(transferred.state.generals.find((general) => general.id === "guan-yu")?.locationCityId === liuCity!.id, "调遣后关羽位置错误");

const memoryStorage = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => memoryStorage.get(key) ?? null,
    setItem: (key: string, value: string) => memoryStorage.set(key, value),
    removeItem: (key: string) => memoryStorage.delete(key),
    clear: () => memoryStorage.clear(),
    key: (index: number) => [...memoryStorage.keys()][index] ?? null,
    get length() { return memoryStorage.size; },
  },
});
saveGame(transferred.state);
const reloaded = loadGame();
assert(reloaded, "保存重载返回空状态");
assert(reloaded!.generals.find((general) => general.id === "guan-yu")?.locationCityId === liuCity!.id, "保存重载后关羽位置不一致");
assert(reloaded!.cities.find((city) => city.id === liuCity!.id)?.generals.includes("guan-yu"), "旧 city.generals 兼容镜像未由权威位置派生");
assertHealthy(reloaded!);

state = endTurn(state);
assertHealthy(state);

console.log("smoke 通过：统一指令、可控战场、BattleOutcome、占城处置、分兵回师、城市调遣、保存重载一致性均完成。");
