import { getUnitActiveSkills } from "./activeSkillSystem";
import { getNearestEnemy } from "./battlefieldSystem";
import type { BattleCommand, BattlefieldState, BattleUnit, GameState } from "../types";

const pickSkill = (state: GameState, battlefield: BattlefieldState, unit: BattleUnit) => {
  const skills = getUnitActiveSkills(state, unit);
  const enemies = unit.side === "player" ? battlefield.enemyUnits : battlefield.playerUnits;
  const allies = unit.side === "player" ? battlefield.playerUnits : battlefield.enemyUnits;
  const nearest = getNearestEnemy(unit, enemies, false);
  const troopRatio = unit.troops / Math.max(1, unit.maxTroops);
  const allyPressure = allies.some((ally) => ally.morale < 42 || ally.troops <= ally.maxTroops * 0.4);
  const enemyWeak = Boolean(nearest && (nearest.morale < 45 || nearest.troops <= nearest.maxTroops * 0.45));
  return skills
    .filter((skill) => unit.skillEnergy >= skill.cost && (unit.cooldowns[skill.id] ?? 0) <= 0 && (skill.targetType !== "gate" || battlefield.battleType === "siege"))
    .map((skill) => {
      let score = 10;
      if (skill.type === "attack" && (enemyWeak || troopRatio > 0.48)) score += 18;
      if (skill.type === "buff" && (allyPressure || unit.role === "commander")) score += 16;
      if (skill.type === "tactic" && (unit.role === "advisor" || unit.role === "rear")) score += 16;
      if (skill.type === "control" && nearest && nearest.skillEnergy >= 45) score += 14;
      if (skill.targetType === "gate" && battlefield.battleType === "siege" && battlefield.cityDefense > 0) score += 22;
      if (unit.morale < 34 && skill.type === "attack") score -= 12;
      if (skill.cost > unit.skillEnergy - 8 && unit.morale > 60) score -= 4;
      return { skill, score };
    })
    .sort((a, b) => b.score - a.score)[0]?.skill;
};

export const chooseAiCommand = (state: GameState, battlefield: BattlefieldState, unit: BattleUnit, enemies: BattleUnit[]): BattleCommand => {
  if (unit.isRouted || unit.troops <= 0) return { unitId: unit.id, commandType: "wait", issuedBy: "ai" };
  const nearest = getNearestEnemy(unit, enemies);
  const troopRatio = unit.troops / Math.max(1, unit.maxTroops);
  const skill = pickSkill(state, battlefield, unit);
  if (skill && unit.morale >= 35) {
    const targetUnitId = skill.targetType === "enemyUnit" ? nearest?.id : undefined;
    return { unitId: unit.id, commandType: "skill", skillId: skill.id, targetUnitId, issuedBy: "ai" };
  }
  if (troopRatio < 0.25 || unit.morale < 28) return { unitId: unit.id, commandType: "retreat", issuedBy: "ai" };
  if (troopRatio < 0.45 || unit.morale < 45) return { unitId: unit.id, commandType: "defend", targetUnitId: nearest?.id, issuedBy: "ai" };
  if (nearest && Math.abs(nearest.position - unit.position) <= 12) return { unitId: unit.id, commandType: "attack", targetUnitId: nearest.id, issuedBy: "ai" };
  return { unitId: unit.id, commandType: "advance", issuedBy: "ai" };
};

export const chooseAutoPlayerCommands = (state: GameState, battlefield: BattlefieldState) => {
  const commands: Record<string, BattleCommand> = {};
  for (const unit of battlefield.playerUnits) {
    commands[unit.id] = chooseAiCommand(state, battlefield, unit, battlefield.enemyUnits);
    commands[unit.id].issuedBy = "player";
  }
  return commands;
};
