import type { TerrainType, Troops, TroopType, WeatherType } from "../types";

export const troopTypes: TroopType[] = ["infantry", "cavalry", "archer", "navy"];

export const totalTroops = (troops: Troops) =>
  troopTypes.reduce((sum, type) => sum + troops[type], 0);

export const scaleTroops = (troops: Troops, ratio: number): Troops => ({
  infantry: Math.max(0, Math.floor(troops.infantry * ratio)),
  cavalry: Math.max(0, Math.floor(troops.cavalry * ratio)),
  archer: Math.max(0, Math.floor(troops.archer * ratio)),
  navy: Math.max(0, Math.floor(troops.navy * ratio)),
});

// 计算兵种、地形、天气带来的整体战斗系数。
export const troopPower = (troops: Troops, terrain: TerrainType, weather: WeatherType) => {
  const base: Record<TroopType, number> = {
    infantry: 1,
    cavalry: 1.12,
    archer: 0.95,
    navy: 0.85,
  };
  const terrainBonus: Record<TroopType, number> = {
    infantry: terrain === "mountain" ? 1.15 : 1,
    cavalry: terrain === "plain" ? 1.15 : terrain === "mountain" || terrain === "river" ? 0.9 : 1,
    archer: terrain === "forest" ? 1.15 : 1,
    navy: terrain === "river" ? 1.25 : 1,
  };
  const weatherBonus: Record<TroopType, number> = {
    infantry: 1,
    cavalry: weather === "snow" ? 0.85 : 1,
    archer: weather === "fog" ? 0.95 : 1,
    navy: 1,
  };
  return troopTypes.reduce((sum, type) => sum + troops[type] * base[type] * terrainBonus[type] * weatherBonus[type], 0);
};

// 兵种克制采用双方兵种占比差计算，避免极端一刀切。
export const counterBonus = (attacker: Troops, defender: Troops) => {
  const aTotal = Math.max(1, totalTroops(attacker));
  const dTotal = Math.max(1, totalTroops(defender));
  const cavalryVsInfantry = attacker.cavalry / aTotal - defender.infantry / dTotal;
  const infantryVsArcher = attacker.infantry / aTotal - defender.archer / dTotal;
  const archerVsCavalry = attacker.archer / aTotal - defender.cavalry / dTotal;
  return 1 + Math.max(-0.18, Math.min(0.18, (cavalryVsInfantry + infantryVsArcher + archerVsCavalry) * 0.18));
};
