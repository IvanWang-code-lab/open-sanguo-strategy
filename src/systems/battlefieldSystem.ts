import { getActiveSkill, getGeneralActiveSkillIds } from "./activeSkillSystem";
import { getFormationCandidates } from "./armyFormationSystem";
import { totalTroops, troopTypes } from "./unitSystem";
import { getActiveGeneralsAtCity } from "../selectors/generalSelectors";
import type { ArmyFormation, BattleLane, BattleUnit, BattleUnitRole, BattlefieldMode, BattlefieldState, City, GameState, General, PendingBattle, Troops } from "../types";

const roleLane: Record<BattleUnitRole, BattleLane> = {
  commander: "center",
  advisor: "center",
  vanguard: "center",
  left: "left",
  right: "right",
  rear: "center",
  reserve: "center",
};

const roleStartPosition: Record<BattleUnitRole, number> = {
  commander: 12,
  advisor: 7,
  vanguard: 18,
  left: 13,
  right: 13,
  rear: 6,
  reserve: 6,
};

export const roleLabels: Record<BattleUnitRole, string> = {
  commander: "主将",
  advisor: "军师",
  vanguard: "先锋",
  left: "左翼",
  right: "右翼",
  rear: "后军",
  reserve: "后军",
};

export const commandLabels = {
  advance: "前进",
  attack: "攻击",
  defend: "防守",
  retreat: "后退",
  focus: "集火",
  wait: "待机",
  skill: "释放技能",
  withdraw: "撤退",
} as const;

const getGeneral = (state: GameState, id?: string) => state.generals.find((general) => general.id === id);

const clampTroops = (troops: Troops): Troops => ({
  infantry: Math.max(0, Math.floor(troops.infantry)),
  cavalry: Math.max(0, Math.floor(troops.cavalry)),
  archer: Math.max(0, Math.floor(troops.archer)),
  navy: Math.max(0, Math.floor(troops.navy)),
});

const scaleMixToTotal = (mix: Troops, targetTotal: number): Troops => {
  const current = Math.max(1, totalTroops(mix));
  const scaled = clampTroops({
    infantry: mix.infantry * targetTotal / current,
    cavalry: mix.cavalry * targetTotal / current,
    archer: mix.archer * targetTotal / current,
    navy: mix.navy * targetTotal / current,
  });
  const diff = targetTotal - totalTroops(scaled);
  scaled.infantry = Math.max(0, scaled.infantry + diff);
  return scaled;
};

const roleFromAssignment = (role: string): BattleUnitRole => role === "reserve" ? "rear" : role as BattleUnitRole;

const makeUnit = (
  state: GameState,
  side: "player" | "enemy",
  general: General | undefined,
  role: BattleUnitRole,
  troops: Troops,
  index: number,
): BattleUnit => {
  const total = Math.max(1, totalTroops(troops));
  const fallbackId = `${side}-militia-${role}-${index}`;
  const positionBase = roleStartPosition[role] ?? 10;
  return {
    id: `${side}-${general?.id ?? fallbackId}-${index}`,
    side,
    generalId: general?.id ?? fallbackId,
    generalName: general?.name ?? (side === "player" ? "随军校尉" : "守军校尉"),
    role,
    lane: roleLane[role],
    position: side === "player" ? positionBase : 100 - positionBase,
    troops: total,
    maxTroops: total,
    morale: Math.max(40, Math.min(100, 62 + Math.floor(((general?.command ?? 60) + (general?.charm ?? 55)) / 12))),
    skillEnergy: Math.min(78, 48 + Math.floor(Math.max(general?.force ?? 55, general?.intelligence ?? 55, general?.charm ?? 55) / 9)),
    cooldowns: {},
    statusEffects: [],
    currentOrder: "wait",
    skills: getGeneralActiveSkillIds(general),
    unitTypeMix: clampTroops(troops),
    isRouted: false,
    kills: 0,
    losses: 0,
    skillUses: 0,
  };
};

const distributeEnemyTroops = (city: City, generals: General[]) => {
  const roles: BattleUnitRole[] = ["commander", "vanguard", "left", "right", "rear", "advisor"];
  const activeGenerals = generals.length > 0 ? generals.slice(0, 6) : [undefined, undefined, undefined];
  const weights = activeGenerals.map((general, index) => {
    if (!general) return 1;
    return 1 + general.command / 130 + (roles[index] === "commander" ? 0.35 : 0);
  });
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  return activeGenerals.map((general, index) => ({
    general,
    role: roles[index] ?? "reserve",
    troops: scaleMixToTotal(city.troops, Math.max(120, Math.floor(totalTroops(city.troops) * (weights[index] / weightTotal)))),
  }));
};

export const getBattlefieldTotal = (units: BattleUnit[]) => units.reduce((sum, unit) => sum + Math.max(0, unit.troops), 0);

export const getNearestEnemy = (unit: BattleUnit, enemies: BattleUnit[], sameLaneOnly = true) => {
  const candidates = enemies.filter((enemy) => !enemy.isRouted && enemy.troops > 0 && (!sameLaneOnly || enemy.lane === unit.lane));
  if (candidates.length === 0) return enemies.find((enemy) => !enemy.isRouted && enemy.troops > 0);
  return [...candidates].sort((a, b) => Math.abs(a.position - unit.position) - Math.abs(b.position - unit.position))[0];
};

export const createBattlefieldState = (state: GameState, pendingBattle: PendingBattle, mode: BattlefieldMode = "classic"): BattlefieldState => {
  const attackerCity = state.cities.find((city) => city.id === pendingBattle.attackerCityId);
  const defenderCity = state.cities.find((city) => city.id === pendingBattle.defenderCityId);
  if (!attackerCity || !defenderCity) throw new Error("战场初始化失败：城市不存在");
  const formation = pendingBattle.formation;
  const playerAssignments = formation.troopAssignments.length > 0
    ? formation.troopAssignments
    : getFormationCandidates(state, attackerCity.id).slice(0, 3).map((general, index) => {
      const role: BattleUnitRole = index === 0 ? "commander" : index === 1 ? "vanguard" : "left";
      return {
      generalId: general.id,
      role,
      infantry: Math.floor(attackerCity.troops.infantry / 4),
      cavalry: Math.floor(attackerCity.troops.cavalry / 4),
      archer: Math.floor(attackerCity.troops.archer / 4),
      navy: Math.floor(attackerCity.troops.navy / 4),
      total: Math.floor(totalTroops(attackerCity.troops) / 4),
      capacity: 9999,
      efficiency: 1,
    };
    });
  const playerUnits = playerAssignments
    .filter((assignment) => assignment.total > 0)
    .slice(0, 6)
    .map((assignment, index) => makeUnit(
      state,
      "player",
      getGeneral(state, assignment.generalId),
      roleFromAssignment(assignment.role),
      { infantry: assignment.infantry, cavalry: assignment.cavalry, archer: assignment.archer, navy: assignment.navy },
      index,
    ));
  const defenderGenerals = getActiveGeneralsAtCity(state, defenderCity.id)
    .sort((a, b) => b.command + b.force - (a.command + a.force));
  const enemyUnits = distributeEnemyTroops(defenderCity, defenderGenerals)
    .slice(0, 6)
    .map((item, index) => makeUnit(state, "enemy", item.general, item.role, item.troops, index));
  const battleType = defenderCity.terrain === "city" || defenderCity.defense >= 55 ? "siege" : "field";
  const battleId = `${attackerCity.id}-${defenderCity.id}-${Date.now()}`;
  return {
    battleId,
    round: 1,
    maxRounds: battleType === "siege" ? 10 : 8,
    terrain: defenderCity.terrain,
    weather: state.currentWeather,
    battleType,
    attackerCityId: attackerCity.id,
    defenderCityId: defenderCity.id,
    playerUnits,
    enemyUnits,
    selectedUnitId: playerUnits[0]?.id,
    pendingCommands: {},
    battleLog: [
      `军议已定：${attackerCity.name}发兵${defenderCity.name}，${playerUnits.length}支部队列阵。`,
      battleType === "siege" ? `攻城战开始，城防 ${defenderCity.defense}。` : "野战展开，三路推进。",
      `主动技能可用：${playerUnits.flatMap((unit) => unit.skills.map((id) => getActiveSkill(id)?.name).filter(Boolean)).slice(0, 8).join("、") || "无"}`,
    ],
    isPaused: true,
    mode,
    cityDefense: defenderCity.defense,
    maxCityDefense: defenderCity.defense,
  };
};

export const reduceUnitTroopsByRatio = (unit: BattleUnit) => scaleMixToTotal(unit.unitTypeMix, Math.max(0, unit.troops));

export const sumUnitTroops = (units: BattleUnit[]): Troops => units.reduce<Troops>((sum, unit) => {
  const mix = reduceUnitTroopsByRatio(unit);
  for (const type of troopTypes) sum[type] += mix[type];
  return sum;
}, { infantry: 0, cavalry: 0, archer: 0, navy: 0 });
