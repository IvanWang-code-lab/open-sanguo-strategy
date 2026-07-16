import { getNeighbors } from "../data/routes";
import { createAutoFormation } from "./armyFormationSystem";
import { calculateCommandState } from "./commandSystem";
import { createBattlefieldState } from "./battlefieldSystem";
import { applyBattlefieldResult } from "./battleResolutionSystem";
import { autoApplyPostBattleSettlement } from "./postBattleSettlementSystem";
import { executeBattleRound } from "./unitCommandSystem";
import { isLiuBeiProtectedTarget } from "./liubeiBalanceSystem";
import { totalTroops } from "./unitSystem";
import type { City, ExpeditionPlanOptions, FormationStyle, GameState } from "../types";

const updateCity = (state: GameState, cityId: string, updater: (city: City) => City): GameState => ({
  ...state,
  cities: state.cities.map((city) => (city.id === cityId ? updater(city) : city)),
});

const aiRecruit = (state: GameState, city: City) =>
  updateCity(state, city.id, (item) => ({
    ...item,
    gold: Math.max(0, item.gold - 80),
    food: Math.max(0, item.food - 80),
    troops: {
      infantry: item.troops.infantry + 90,
      cavalry: item.troops.cavalry + 35,
      archer: item.troops.archer + 55,
      navy: item.terrain === "river" ? item.troops.navy + 45 : item.troops.navy + 10,
    },
    actedThisTurn: true,
  }));

const aiDevelop = (state: GameState, city: City, type: "agriculture" | "commerce" | "defense") =>
  updateCity(state, city.id, (item) => ({
    ...item,
    gold: Math.max(0, item.gold - 70),
    agriculture: type === "agriculture" ? Math.min(100, item.agriculture + 6) : item.agriculture,
    commerce: type === "commerce" ? Math.min(100, item.commerce + 6) : item.commerce,
    defense: type === "defense" ? Math.min(100, item.defense + 7) : item.defense,
    actedThisTurn: true,
  }));

const aiRest = (state: GameState, city: City) =>
  updateCity(state, city.id, (item) => ({
    ...item,
    gold: Math.max(0, item.gold - 35),
    morale: Math.min(100, item.morale + 5),
    publicOrder: Math.min(100, item.publicOrder + 2),
    cityFatigue: Math.max(0, (item.cityFatigue ?? 0) - 16),
    recoveryHint: "AI 本回合转入休整，城市压力下降。",
    actedThisTurn: true,
  }));

const getAiFormationStyle = (style: string): FormationStyle => {
  if (style === "aggressive" || style === "opportunist") return "cavalry";
  if (style === "defensive") return "steady";
  return "auto";
};

const getAiExpeditionOptions = (style: string, troopAdvantage: boolean): ExpeditionPlanOptions => {
  if (style === "aggressive") return { sortiePreset: troopAdvantage ? "main" : "standard", garrisonPreset: "20" };
  if (style === "defensive") return { sortiePreset: "probe", garrisonPreset: "50" };
  if (style === "economic") return { sortiePreset: "probe", garrisonPreset: "50" };
  if (style === "opportunist") return { sortiePreset: troopAdvantage ? "allIn" : "probe", garrisonPreset: troopAdvantage ? "30" : "50" };
  return { sortiePreset: troopAdvantage ? "standard" : "probe", garrisonPreset: "30" };
};

// AI 按统一指令预算行动，避免非玩家势力无限操作。
export const runAiTurn = (state: GameState) => {
  let next = state;
  const logs: string[] = [];
  const aiFactions = next.factions.filter((faction) => faction.id !== next.playerFactionId);
  for (const faction of aiFactions) {
    let budget = calculateCommandState(next, faction.id);
    let commands = budget.commands ?? budget.maxCommands ?? 1;
    let actions = 0;
    const maxAiActions = Math.min(5, Math.max(1, budget.maxCommands ?? commands));
    while (actions < maxAiActions && commands > 0) {
      const cities = next.cities.filter((city) => city.factionId === faction.id && !city.actedThisTurn);
      if (cities.length === 0) break;
      const front = cities
        .map((city) => ({
          city,
          targets: getNeighbors(city.id)
            .map((id) => next.cities.find((item) => item.id === id))
            .filter((item): item is City => item !== undefined && item.factionId !== faction.id && !isLiuBeiProtectedTarget(next, item)),
        }))
        .filter((item) => item.targets.length > 0);
      const candidate = front.sort((a, b) => totalTroops(b.city.troops) - totalTroops(a.city.troops))[0] ?? { city: cities[0], targets: [] };
      const city = candidate.city;
      const weakTarget = candidate.targets.sort((a, b) => totalTroops(a.troops) - totalTroops(b.troops))[0];
      const troopAdvantage = weakTarget ? totalTroops(city.troops) > totalTroops(weakTarget.troops) * 1.25 : false;
      const fatigue = city.cityFatigue ?? 0;
      const pressurePenalty = fatigue >= 55 || city.morale < 58 ? 0.18 : 0;
      const attackChance = Math.max(0.12, (faction.aiStyle === "aggressive" ? 0.7 : faction.aiStyle === "defensive" ? 0.28 : 0.45) - pressurePenalty);

      if ((fatigue >= 60 || city.morale < 55) && commands >= 1 && city.gold >= 35) {
        next = aiRest(next, city);
        commands -= 1;
        logs.push(`${faction.name}判断${city.name}疲劳或士气压力偏高，使用1指令转入休整。`);
        actions += 1;
        continue;
      }

      if (weakTarget && troopAdvantage && commands >= 1 && Math.random() < attackChance) {
        const formation = createAutoFormation(
          next,
          city.id,
          weakTarget.id,
          getAiFormationStyle(faction.aiStyle),
          weakTarget.terrain === "river" ? "navy" : weakTarget.defense >= 60 ? "siege" : "balanced",
          {},
          getAiExpeditionOptions(faction.aiStyle, troopAdvantage),
        );
        if (formation.garrisonRiskLevel === "high" && faction.aiStyle !== "aggressive" && faction.aiStyle !== "opportunist") {
          commands -= 1;
          logs.push(`${faction.name}评估${city.name}留守风险过高，暂缓出征并整军。`);
          actions += 1;
          continue;
        }
        const battle = { attackerCityId: city.id, defenderCityId: weakTarget.id, formation, controlMode: "autoWatch" as const };
        let battlefield = createBattlefieldState(next, battle, "autoWatch");
        while (!battlefield.result && battlefield.round <= battlefield.maxRounds + 1) {
          battlefield = executeBattleRound(next, battlefield);
        }
        const result = applyBattlefieldResult(next, battle, battlefield);
        next = result.state.pendingPostBattleSettlement ? autoApplyPostBattleSettlement(result.state).state : result.state;
        commands -= 1;
        logs.push(`${faction.name}判断${weakTarget.name}守备可图，从${city.name}发兵并保留后方守备：${result.report?.resultText ?? "战斗结束"}`);
        actions += 1;
        continue;
      }
      if (totalTroops(city.troops) < 1400 && city.gold >= 80 && city.food >= 80 && commands >= 1) {
        next = aiRecruit(next, city);
        commands -= 1;
        logs.push(`${faction.name}使用1指令，在${city.name}征兵备战`);
        actions += 1;
        continue;
      }
      if (commands < 1) break;
      if (faction.aiStyle === "defensive") {
        next = aiDevelop(next, city, "defense");
        logs.push(`${faction.name}使用1指令，修筑${city.name}城防`);
      } else if (faction.aiStyle === "economic") {
        next = aiDevelop(next, city, city.commerce < city.agriculture ? "commerce" : "agriculture");
        logs.push(`${faction.name}使用1指令，发展${city.name}民生`);
      } else {
        next = aiDevelop(next, city, Math.random() > 0.5 ? "agriculture" : "commerce");
        logs.push(`${faction.name}使用1指令，经营${city.name}`);
      }
      commands -= 1;
      actions += 1;
    }
  }
  return { state: next, logs: state.commandPreferences?.aiBattleLogLevel === "brief" ? logs.filter((log) => log.includes("出征")).slice(0, 8) : logs.slice(0, 18) };
};
