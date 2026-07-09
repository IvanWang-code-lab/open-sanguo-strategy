import { getActiveSkill } from "./activeSkillSystem";
import { chooseAiCommand } from "./battleAiController";
import { getBattlefieldTotal, getNearestEnemy } from "./battlefieldSystem";
import { counterBonus, troopPower } from "./unitSystem";
import type { ActiveSkill, BattleCommand, BattlefieldResult, BattlefieldState, BattleUnit, GameState, Troops } from "../types";

const cloneBattlefield = (battlefield: BattlefieldState): BattlefieldState => JSON.parse(JSON.stringify(battlefield)) as BattlefieldState;

const commandText: Record<string, string> = {
  advance: "前进",
  attack: "攻击",
  defend: "防守",
  retreat: "后退",
  focus: "集火",
  wait: "待机",
  skill: "释放技能",
  withdraw: "撤退",
};

const totalMix = (unit: BattleUnit): Troops => {
  const ratio = unit.troops / Math.max(1, unit.maxTroops);
  return {
    infantry: Math.max(0, Math.floor(unit.unitTypeMix.infantry * ratio)),
    cavalry: Math.max(0, Math.floor(unit.unitTypeMix.cavalry * ratio)),
    archer: Math.max(0, Math.floor(unit.unitTypeMix.archer * ratio)),
    navy: Math.max(0, Math.floor(unit.unitTypeMix.navy * ratio)),
  };
};

const findUnit = (battlefield: BattlefieldState, unitId?: string) =>
  [...battlefield.playerUnits, ...battlefield.enemyUnits].find((unit) => unit.id === unitId);

const sideEnemies = (battlefield: BattlefieldState, unit: BattleUnit) => unit.side === "player" ? battlefield.enemyUnits : battlefield.playerUnits;

const sideAllies = (battlefield: BattlefieldState, unit: BattleUnit) => unit.side === "player" ? battlefield.playerUnits : battlefield.enemyUnits;

const changeTroops = (unit: BattleUnit, delta: number) => {
  const before = unit.troops;
  unit.troops = Math.max(0, Math.min(unit.maxTroops, unit.troops + delta));
  if (delta < 0) unit.losses += before - unit.troops;
  if (unit.troops <= 0) {
    unit.isRouted = true;
    unit.morale = 0;
  }
};

const changeMorale = (unit: BattleUnit, delta: number) => {
  unit.morale = Math.max(0, Math.min(100, unit.morale + delta));
  if (unit.morale <= 12 && unit.troops > 0) unit.isRouted = true;
};

const getGeneral = (state: GameState, unit: BattleUnit) => state.generals.find((general) => general.id === unit.generalId);

const unitAttackPower = (state: GameState, battlefield: BattlefieldState, unit: BattleUnit) => {
  const general = getGeneral(state, unit);
  const mix = totalMix(unit);
  const base = troopPower(mix, battlefield.terrain, battlefield.weather);
  const stat = 1 + (general?.force ?? 55) / 240 + (general?.command ?? 55) / 320 + unit.morale / 320;
  const status = unit.statusEffects.reduce((value, effect) => value * (effect.attackModifier ?? 1), 1);
  return Math.max(20, base * stat * status);
};

const unitDefensePower = (state: GameState, battlefield: BattlefieldState, unit: BattleUnit) => {
  const general = getGeneral(state, unit);
  const mix = totalMix(unit);
  const base = troopPower(mix, battlefield.terrain, battlefield.weather);
  const stat = 1 + (general?.command ?? 55) / 250 + unit.morale / 360;
  const defendBonus = unit.currentOrder === "defend" ? 1.35 : unit.currentOrder === "retreat" ? 1.12 : 1;
  const status = unit.statusEffects.reduce((value, effect) => value * (effect.defenseModifier ?? 1), 1);
  return Math.max(20, base * stat * defendBonus * status);
};

const dealDamage = (state: GameState, battlefield: BattlefieldState, attacker: BattleUnit, defender: BattleUnit, multiplier: number, log: string[]) => {
  if (attacker.isRouted || defender.isRouted || attacker.troops <= 0 || defender.troops <= 0) return 0;
  const counter = counterBonus(totalMix(attacker), totalMix(defender));
  const attack = unitAttackPower(state, battlefield, attacker) * counter * multiplier;
  const defense = unitDefensePower(state, battlefield, defender);
  const damage = Math.max(18, Math.floor((attack / Math.max(60, defense)) * (38 + attacker.troops * 0.055)));
  changeTroops(defender, -damage);
  changeMorale(defender, -Math.max(2, Math.floor(damage / Math.max(90, defender.maxTroops / 12))));
  attacker.kills += damage;
  attacker.skillEnergy = Math.min(100, attacker.skillEnergy + 8);
  defender.skillEnergy = Math.min(100, defender.skillEnergy + 6);
  log.push(`${attacker.generalName}部攻击${defender.generalName}部，敌损${damage}。`);
  return damage;
};

const applySkill = (state: GameState, battlefield: BattlefieldState, unit: BattleUnit, command: BattleCommand, log: string[]) => {
  const skill = command.skillId ? getActiveSkill(command.skillId) : undefined;
  if (!skill || unit.skillEnergy < skill.cost || (unit.cooldowns[skill.id] ?? 0) > 0) return false;
  const enemies = sideEnemies(battlefield, unit);
  const allies = sideAllies(battlefield, unit);
  const target = findUnit(battlefield, command.targetUnitId) ?? getNearestEnemy(unit, enemies, false);
  unit.skillEnergy -= skill.cost;
  unit.cooldowns[skill.id] = skill.cooldown;
  unit.skillUses += 1;
  const rainPenalty = skill.id === "active-fire" && battlefield.weather === "rain" ? 0.58 : 1;
  const general = getGeneral(state, unit);
  const smartBonus = 1 + (general?.intelligence ?? 55) / 450;
  let effectText = "";

  if (skill.effect === "damage_push" && target) {
    const damage = dealDamage(state, battlefield, unit, target, 1.65, log);
    unit.position = Math.min(100, unit.position + (unit.side === "player" ? 8 : -8));
    effectText = `${skill.name}击中${target.generalName}部，杀伤${damage}并推进。`;
  } else if (skill.effect === "heavy_damage_morale" && target) {
    const damage = dealDamage(state, battlefield, unit, target, 2.05, log);
    changeMorale(target, -10);
    effectText = `${skill.name}重创${target.generalName}部，额外压低士气。`;
  } else if (skill.effect === "lane_damage") {
    const laneTargets = enemies.filter((enemy) => enemy.lane === unit.lane && !enemy.isRouted);
    const losses = laneTargets.reduce((sum, enemy) => sum + dealDamage(state, battlefield, unit, enemy, 1.35, log), 0);
    effectText = `${skill.name}横扫${unit.lane}路，合计杀伤${losses}。`;
  } else if (skill.effect === "lane_morale_down") {
    const laneTargets = enemies.filter((enemy) => enemy.lane === unit.lane && !enemy.isRouted);
    laneTargets.forEach((enemy) => {
      changeMorale(enemy, -16);
      enemy.position += unit.side === "player" ? 5 : -5;
    });
    effectText = `${skill.name}震慑${unit.lane}路敌军，敌军士气下降。`;
  } else if (skill.effect === "ally_morale_up") {
    allies.forEach((ally) => changeMorale(ally, 12));
    effectText = `${skill.name}鼓动全军，己方士气上升。`;
  } else if (skill.effect === "ally_defense_up") {
    allies.forEach((ally) => {
      ally.statusEffects.push({ id: "steady", name: "稳军", duration: 2, defenseModifier: 1.18, moraleModifier: 1 });
      changeMorale(ally, 5);
    });
    effectText = `${skill.name}稳住全军阵脚，本轮损失下降。`;
  } else if (skill.effect === "ally_attack_push") {
    allies.forEach((ally) => {
      ally.statusEffects.push({ id: "order", name: "号令", duration: 2, attackModifier: 1.16, movementModifier: 1.15 });
      ally.position += ally.side === "player" ? 4 : -4;
    });
    effectText = `${skill.name}催动全军推进。`;
  } else if (skill.effect === "lane_fire_damage") {
    const laneTargets = enemies.filter((enemy) => enemy.lane === unit.lane && !enemy.isRouted);
    let losses = 0;
    for (const enemy of laneTargets) {
      const damage = Math.floor((80 + (general?.intelligence ?? 60) * 1.8) * rainPenalty * smartBonus);
      changeTroops(enemy, -damage);
      changeMorale(enemy, battlefield.weather === "rain" ? -5 : -13);
      losses += damage;
      unit.kills += damage;
    }
    effectText = `${skill.name}${battlefield.weather === "rain" ? "受雨势影响，" : ""}焚击${unit.lane}路，杀伤${losses}。`;
  } else if (skill.effect === "enemy_order_down" && target) {
    target.statusEffects.push({ id: "cunning", name: "奇谋", duration: 2, attackModifier: 0.78, movementModifier: 0.7 });
    changeMorale(target, -8);
    effectText = `${skill.name}扰乱${target.generalName}部，本轮命令效率下降。`;
  } else if (skill.effect === "counter_tactic") {
    unit.statusEffects.push({ id: "detect", name: "识破", duration: 2, defenseModifier: 1.12, preventedSkill: true });
    unit.skillEnergy = Math.min(100, unit.skillEnergy + 12);
    effectText = `${skill.name}预判敌策，计略点回升。`;
  } else if (skill.effect === "ally_recover") {
    const ally = target?.side === unit.side ? target : unit;
    changeMorale(ally, 14);
    ally.statusEffects = ally.statusEffects.filter((effect) => effect.id !== "cunning");
    effectText = `${skill.name}整肃${ally.generalName}部，士气恢复。`;
  } else if (skill.effect === "gate_damage") {
    const damage = Math.floor((90 + (general?.command ?? 60) * 1.6 + unit.troops * 0.035) * (battlefield.battleType === "siege" ? 1 : 0.35));
    battlefield.cityDefense = Math.max(0, battlefield.cityDefense - damage);
    effectText = `${skill.name}压向城门，城防下降${damage}。`;
  } else if (skill.effect === "liubei_benevolence") {
    allies.forEach((ally) => {
      const lowTroops = ally.troops <= ally.maxTroops * 0.45;
      changeMorale(ally, lowTroops ? 18 : 10);
      if (lowTroops) ally.statusEffects.push({ id: "benevolence-guard", name: "仁德护军", duration: 2, defenseModifier: 1.16 });
    });
    effectText = `${skill.name}稳住全军，低兵力友军额外获得防守加成。`;
  } else if (skill.effect === "guanyu_wusheng" && target) {
    const damage = dealDamage(state, battlefield, unit, target, target.morale <= 42 ? 2.45 : 2.05, log);
    changeMorale(target, -14);
    if (target.morale <= 18 || target.troops <= target.maxTroops * 0.16) target.isRouted = true;
    unit.position = Math.min(100, unit.position + (unit.side === "player" ? 10 : -10));
    effectText = `${skill.name}斩入正面，杀伤${damage}，${target.generalName}部士气大挫。`;
  } else if (skill.effect === "zhangfei_roar") {
    const laneTargets = enemies.filter((enemy) => enemy.lane === unit.lane && !enemy.isRouted);
    laneTargets.forEach((enemy) => {
      changeMorale(enemy, enemy.morale <= 40 ? -26 : -18);
      enemy.position += unit.side === "player" ? 8 : -8;
      if (enemy.morale <= 14) enemy.isRouted = true;
    });
    effectText = `${skill.name}震裂${unit.lane}路，敌军士气崩落并被迫后退。`;
  } else if (skill.effect === "zhaoyun_rescue") {
    const weakest = allies.filter((ally) => ally.id !== unit.id).sort((a, b) => a.troops / Math.max(1, a.maxTroops) - b.troops / Math.max(1, b.maxTroops))[0];
    unit.statusEffects.push({ id: "longdan", name: "龙胆", duration: 2, defenseModifier: 1.22, movementModifier: 1.22 });
    unit.position = Math.min(100, unit.position + (unit.side === "player" ? 9 : -9));
    if (weakest) {
      changeMorale(weakest, 14);
      weakest.statusEffects.push({ id: "rescued", name: "救场", duration: 2, defenseModifier: 1.14 });
    }
    effectText = `${skill.name}穿插救场，${weakest ? `${weakest.generalName}部军心回稳` : "自身防御提升"}。`;
  } else if (skill.effect === "caocao_order") {
    allies.forEach((ally) => {
      ally.statusEffects.push({ id: "weiwu", name: "魏武", duration: 2, attackModifier: 1.2, movementModifier: 1.16 });
      ally.skillEnergy = Math.min(100, ally.skillEnergy + 10);
      ally.position += ally.side === "player" ? 5 : -5;
    });
    effectText = `${skill.name}催动全军，攻击、推进和技能能量上升。`;
  } else if (skill.effect === "sunquan_guard") {
    const riverBonus = battlefield.terrain === "river" ? 1.08 : 1;
    allies.forEach((ally) => {
      ally.statusEffects.push({ id: "jiangdong-guard", name: "江东稳军", duration: 2, defenseModifier: 1.18 * riverBonus });
      changeMorale(ally, battlefield.terrain === "river" ? 14 : 9);
    });
    effectText = `${skill.name}${battlefield.terrain === "river" ? "借江东水势" : ""}提升防守与士气恢复。`;
  } else if (skill.effect === "lvbu_peerless") {
    const laneTargets = enemies.filter((enemy) => enemy.lane === unit.lane && !enemy.isRouted);
    const losses = laneTargets.reduce((sum, enemy) => sum + dealDamage(state, battlefield, unit, enemy, 2.05, log), 0);
    laneTargets.forEach((enemy) => changeMorale(enemy, -18));
    unit.position = Math.min(100, unit.position + (unit.side === "player" ? 12 : -12));
    effectText = `${skill.name}横扫${unit.lane}路，合计杀伤${losses}。`;
  } else if (skill.effect === "zhuge_counter") {
    allies.forEach((ally) => {
      ally.statusEffects.push({ id: "eight-array", name: "八阵", duration: 2, defenseModifier: 1.18, preventedSkill: true });
      changeMorale(ally, 8);
    });
    enemies.forEach((enemy) => enemy.statusEffects.push({ id: "array-confused", name: "阵迷", duration: 2, attackModifier: 0.86, movementModifier: 0.82 }));
    effectText = `${skill.name}布阵识破敌势，己方防守上升并削弱敌军技能攻势。`;
  } else if (skill.effect === "zhouyu_chibi_fire") {
    const weatherFactor = battlefield.weather === "rain" ? 0.55 : battlefield.weather === "sunny" ? 1.18 : 1;
    const riverFactor = battlefield.terrain === "river" ? 1.16 : 1;
    const laneTargets = enemies.filter((enemy) => enemy.lane === unit.lane && !enemy.isRouted);
    let losses = 0;
    for (const enemy of laneTargets) {
      const damage = Math.floor((130 + (general?.intelligence ?? 80) * 2.15) * weatherFactor * riverFactor * smartBonus);
      changeTroops(enemy, -damage);
      changeMorale(enemy, battlefield.weather === "rain" ? -8 : -18);
      unit.kills += damage;
      losses += damage;
    }
    effectText = `${skill.name}${battlefield.weather === "rain" ? "受雨势压制，" : ""}火烧${unit.lane}路，杀伤${losses}。`;
  } else if (skill.effect === "simayi_counter") {
    allies.forEach((ally) => ally.statusEffects.push({ id: "deep-counter", name: "后发", duration: 2, defenseModifier: 1.16, attackModifier: 1.08, preventedSkill: true }));
    enemies.forEach((enemy) => {
      enemy.statusEffects.push({ id: "countered", name: "反制", duration: 2, attackModifier: 0.84, movementModifier: 0.85 });
      changeMorale(enemy, -6);
    });
    effectText = `${skill.name}后发制人，削弱敌军命令效率并强化反击。`;
  } else if (skill.effect === "machao_charge" && target) {
    const terrainFactor = battlefield.terrain === "plain" ? 1.22 : battlefield.terrain === "mountain" ? 0.82 : 1;
    const weatherFactor = battlefield.weather === "snow" ? 0.78 : 1;
    const damage = dealDamage(state, battlefield, unit, target, 1.92 * terrainFactor * weatherFactor, log);
    unit.position = Math.min(100, unit.position + (unit.side === "player" ? 13 : -13));
    changeMorale(target, -10);
    effectText = `${skill.name}疾冲敌阵，杀伤${damage}${battlefield.terrain === "plain" ? "，平原冲势更盛" : ""}。`;
  } else if (skill.effect === "huangzhong_shot" && target) {
    const priorityBonus = target.role === "commander" || target.role === "vanguard" ? 1.22 : 1;
    const damage = Math.floor((120 + (general?.force ?? 80) * 1.6 + unit.troops * 0.028) * priorityBonus);
    changeTroops(target, -damage);
    changeMorale(target, -14);
    unit.kills += damage;
    effectText = `${skill.name}远射${target.generalName}部，杀伤${damage}并压低士气。`;
  } else if (skill.effect === "zhangliao_raid" && target) {
    const exposed = target.position < 72 && target.side === "enemy" || target.position > 28 && target.side === "player";
    const damage = dealDamage(state, battlefield, unit, target, exposed ? 2.0 : 1.55, log);
    unit.position = Math.min(100, unit.position + (unit.side === "player" ? 11 : -11));
    changeMorale(target, -10);
    effectText = `${skill.name}${exposed ? "抓住防线空隙，" : ""}突袭${target.generalName}部，杀伤${damage}。`;
  } else if (skill.effect === "luxun_fire_guard") {
    const laneTargets = enemies.filter((enemy) => enemy.lane === unit.lane && !enemy.isRouted);
    let losses = 0;
    for (const enemy of laneTargets) {
      const damage = Math.floor((95 + (general?.intelligence ?? 78) * 1.75) * rainPenalty * smartBonus);
      changeTroops(enemy, -damage);
      changeMorale(enemy, -10);
      unit.kills += damage;
      losses += damage;
    }
    allies.forEach((ally) => ally.statusEffects.push({ id: "lianying-guard", name: "连营", duration: 2, defenseModifier: 1.12 }));
    effectText = `${skill.name}稳守放火，杀伤${losses}并提升己方防守。`;
  } else if (skill.effect === "jiaxu_poison" && target) {
    target.statusEffects.push({ id: "poison-tactic", name: "乱阵", duration: 3, attackModifier: 0.72, defenseModifier: 0.88, movementModifier: 0.68 });
    changeMorale(target, -20);
    target.skillEnergy = Math.max(0, target.skillEnergy - 18);
    effectText = `${skill.name}扰乱${target.generalName}部，士气、命令效率和技能能量下降。`;
  }

  log.push(`${unit.generalName}发动【${skill.name}】：${effectText}`);
  return true;
};

const applyMovement = (unit: BattleUnit, command: BattleCommand) => {
  const direction = unit.side === "player" ? 1 : -1;
  const movementModifier = unit.statusEffects.reduce((value, effect) => value * (effect.movementModifier ?? 1), 1);
  if (command.commandType === "advance") unit.position += direction * Math.round(8 * movementModifier);
  if (command.commandType === "attack" || command.commandType === "focus") unit.position += direction * Math.round(4 * movementModifier);
  if (command.commandType === "defend") unit.position += direction * Math.round(1 * movementModifier);
  if (command.commandType === "retreat" || command.commandType === "withdraw") unit.position -= direction * Math.round(8 * movementModifier);
  unit.position = Math.max(0, Math.min(100, unit.position));
};

const tickUnit = (unit: BattleUnit) => {
  for (const key of Object.keys(unit.cooldowns)) unit.cooldowns[key] = Math.max(0, unit.cooldowns[key] - 1);
  unit.statusEffects = unit.statusEffects
    .map((effect) => ({ ...effect, duration: effect.duration - 1 }))
    .filter((effect) => effect.duration > 0);
  unit.skillEnergy = Math.min(100, unit.skillEnergy + (unit.currentOrder === "wait" ? 14 : unit.currentOrder === "defend" ? 10 : 7));
  if (!unit.isRouted && unit.troops > 0 && unit.morale < 18) unit.isRouted = true;
};

const makeResult = (battlefield: BattlefieldState, outcome?: "withdraw"): BattlefieldResult | undefined => {
  const attackerRemaining = getBattlefieldTotal(battlefield.playerUnits);
  const defenderRemaining = getBattlefieldTotal(battlefield.enemyUnits);
  const attackerStart = battlefield.playerUnits.reduce((sum, unit) => sum + unit.maxTroops, 0);
  const defenderStart = battlefield.enemyUnits.reduce((sum, unit) => sum + unit.maxTroops, 0);
  const defenderMorale = battlefield.enemyUnits.reduce((sum, unit) => sum + unit.morale, 0) / Math.max(1, battlefield.enemyUnits.length);
  const attackerMorale = battlefield.playerUnits.reduce((sum, unit) => sum + unit.morale, 0) / Math.max(1, battlefield.playerUnits.length);
  const enemyCommanderRouted = battlefield.enemyUnits.some((unit) => unit.role === "commander" && unit.isRouted);
  const playerCommanderRouted = battlefield.playerUnits.some((unit) => unit.role === "commander" && unit.isRouted);
  const siegeGateBroken = battlefield.battleType === "siege" && battlefield.cityDefense <= 0 && defenderRemaining <= defenderStart * 0.45;

  let winner: BattlefieldResult["winner"] | undefined;
  if (outcome === "withdraw") winner = "withdraw";
  else if (defenderRemaining <= defenderStart * 0.2 || defenderMorale <= 15 || enemyCommanderRouted || siegeGateBroken) winner = "attacker";
  else if (attackerRemaining <= attackerStart * 0.2 || attackerMorale <= 12 || playerCommanderRouted) winner = "defender";
  else if (battlefield.round > battlefield.maxRounds) winner = attackerRemaining / Math.max(1, attackerStart) > defenderRemaining / Math.max(1, defenderStart) + 0.18 && (battlefield.battleType !== "siege" || battlefield.cityDefense <= battlefield.maxCityDefense * 0.35) ? "attacker" : "defender";
  if (!winner) return undefined;

  const unitResults = [...battlefield.playerUnits, ...battlefield.enemyUnits].map((unit) => ({
    unitId: unit.id,
    generalName: unit.generalName,
    role: unit.role,
    startTroops: unit.maxTroops,
    remainingTroops: Math.max(0, unit.troops),
    losses: Math.max(0, unit.maxTroops - unit.troops),
    kills: unit.kills,
    skillUses: unit.skillUses,
    routed: unit.isRouted,
  }));
  const attackerLoss = Math.max(0, attackerStart - attackerRemaining);
  const defenderLoss = Math.max(0, defenderStart - defenderRemaining);
  const occupied = winner === "attacker";
  return {
    winner,
    outcome: winner === "attacker" ? "victory" : winner === "withdraw" ? "withdraw" : "defeat",
    occupied,
    unitResults,
    skillRecords: [],
    commandRecords: [],
    cityChanges: [],
    experienceGains: [],
    summary: winner === "attacker" ? "我军突破敌阵，取得战场胜利。" : winner === "withdraw" ? "我军主动撤退，保全余部。" : "我军攻势受挫，被迫退回整备。",
    nextAdvice: winner === "attacker" ? "胜后注意安抚新城并整备疲劳部队。" : "建议训练、休整、侦察后再战。",
    attackerRemaining,
    defenderRemaining,
    attackerLoss,
    defenderLoss,
    cityDefenseDamage: Math.max(0, battlefield.maxCityDefense - battlefield.cityDefense),
  };
};

export const issueBattleCommand = (battlefield: BattlefieldState, command: BattleCommand): BattlefieldState => ({
  ...battlefield,
  selectedUnitId: command.unitId,
  pendingCommands: {
    ...battlefield.pendingCommands,
    [command.unitId]: command,
  },
});

export const executeBattleRound = (state: GameState, battlefieldInput: BattlefieldState): BattlefieldState => {
  const battlefield = cloneBattlefield(battlefieldInput);
  const roundLog: string[] = [];
  const playerCommands = battlefield.mode === "autoWatch"
    ? Object.fromEntries(battlefield.playerUnits.map((unit) => [unit.id, chooseAiCommand(state, battlefield, unit, battlefield.enemyUnits)]))
    : battlefield.pendingCommands;
  const commands: BattleCommand[] = [
    ...battlefield.playerUnits.map((unit) => playerCommands[unit.id] ?? { unitId: unit.id, commandType: "wait" as const, issuedBy: "player" as const }),
    ...battlefield.enemyUnits.map((unit) => chooseAiCommand(state, battlefield, unit, battlefield.playerUnits)),
  ];

  if (commands.some((command) => command.commandType === "withdraw" && command.issuedBy === "player")) {
    battlefield.result = makeResult(battlefield, "withdraw");
    battlefield.battleLog = [...battlefield.battleLog, `第${battlefield.round}回合：我军鸣金撤退，保全余部。`];
    return battlefield;
  }

  for (const command of commands) {
    const unit = findUnit(battlefield, command.unitId);
    if (!unit || unit.isRouted || unit.troops <= 0) continue;
    unit.currentOrder = command.commandType;
    if (command.commandType === "skill") applySkill(state, battlefield, unit, command, roundLog);
  }

  for (const command of commands) {
    const unit = findUnit(battlefield, command.unitId);
    if (!unit || unit.isRouted || unit.troops <= 0) continue;
    applyMovement(unit, command);
  }

  for (const command of commands) {
    const unit = findUnit(battlefield, command.unitId);
    if (!unit || unit.isRouted || unit.troops <= 0 || command.commandType === "skill" || command.commandType === "wait") continue;
    const enemies = sideEnemies(battlefield, unit);
    const explicitTarget = findUnit(battlefield, command.targetUnitId);
    const target = explicitTarget && explicitTarget.side !== unit.side ? explicitTarget : getNearestEnemy(unit, enemies, command.commandType !== "focus");
    if (!target) continue;
    const distance = Math.abs(unit.position - target.position);
    if (command.commandType === "advance") {
      changeMorale(unit, 2);
      if (distance <= 8) dealDamage(state, battlefield, unit, target, 0.7, roundLog);
    } else if (command.commandType === "attack") {
      dealDamage(state, battlefield, unit, target, distance <= 14 ? 1.15 : 0.7, roundLog);
      if (distance <= 10) dealDamage(state, battlefield, target, unit, target.currentOrder === "defend" ? 0.75 : 0.45, roundLog);
    } else if (command.commandType === "focus") {
      dealDamage(state, battlefield, unit, target, 1.35, roundLog);
      changeMorale(unit, -2);
    } else if (command.commandType === "defend") {
      changeMorale(unit, 3);
      if (distance <= 10) dealDamage(state, battlefield, unit, target, 0.62, roundLog);
    } else if (command.commandType === "retreat") {
      changeMorale(unit, -4);
      if (distance <= 8) dealDamage(state, battlefield, target, unit, 0.35, roundLog);
    }
  }

  if (battlefield.battleType === "siege") {
    const pressure = battlefield.playerUnits.reduce((sum, unit) => {
      if (unit.isRouted || unit.troops <= 0 || unit.position < 82) return sum;
      return sum + Math.max(2, Math.floor(unit.troops * (unit.currentOrder === "attack" || unit.currentOrder === "focus" ? 0.016 : 0.008)));
    }, 0);
    if (pressure > 0) {
      battlefield.cityDefense = Math.max(0, battlefield.cityDefense - pressure);
      roundLog.push(`攻城压力削减城防 ${pressure}。`);
    }
  }

  for (const unit of [...battlefield.playerUnits, ...battlefield.enemyUnits]) tickUnit(unit);
  const result = makeResult({ ...battlefield, round: battlefield.round + 1 });
  battlefield.result = result;
  battlefield.battleLog = [
    ...battlefield.battleLog,
    `第${battlefield.round}回合执行：${commands.filter((command) => command.issuedBy === "player").map((command) => commandText[command.commandType]).join("、") || "待机"}`,
    ...roundLog.slice(-8),
  ].slice(-60);
  battlefield.pendingCommands = {};
  battlefield.round += 1;
  return battlefield;
};
