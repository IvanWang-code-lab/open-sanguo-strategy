import { getNeighbors } from "../data/routes";
import { createAutoFormation } from "./armyFormationSystem";
import { resolveBattle } from "./battleSystem";
import { calculateCommandState } from "./commandSystem";
import { createAutoTacticalChoices } from "./battleTacticsSystem";
import { totalTroops } from "./unitSystem";
import type { City, GameState } from "../types";

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

// AI 按自身政令/军令预算行动，避免非玩家势力无限操作。
export const runAiTurn = (state: GameState) => {
  let next = state;
  const logs: string[] = [];
  const aiFactions = next.factions.filter((faction) => faction.id !== next.playerFactionId);
  for (const faction of aiFactions) {
    let budget = calculateCommandState(next, faction.id);
    let actions = 0;
    const maxAiActions = Math.min(4, Math.max(1, budget.maxPoliticalOrders + budget.maxMilitaryOrders));
    while (actions < maxAiActions && (budget.politicalOrders > 0 || budget.militaryOrders > 0)) {
      const cities = next.cities.filter((city) => city.factionId === faction.id && !city.actedThisTurn);
      if (cities.length === 0) break;
      const front = cities
        .map((city) => ({
          city,
          targets: getNeighbors(city.id)
            .map((id) => next.cities.find((item) => item.id === id))
            .filter((item): item is City => item !== undefined && item.factionId !== faction.id),
        }))
        .filter((item) => item.targets.length > 0);
      const candidate = front.sort((a, b) => totalTroops(b.city.troops) - totalTroops(a.city.troops))[0] ?? { city: cities[0], targets: [] };
      const city = candidate.city;
      const weakTarget = candidate.targets.sort((a, b) => totalTroops(a.troops) - totalTroops(b.troops))[0];
      const troopAdvantage = weakTarget ? totalTroops(city.troops) > totalTroops(weakTarget.troops) * 1.25 : false;
      const attackChance = faction.aiStyle === "aggressive" ? 0.7 : faction.aiStyle === "defensive" ? 0.28 : 0.45;

      if (weakTarget && troopAdvantage && budget.militaryOrders >= 2 && Math.random() < attackChance) {
        const formation = createAutoFormation(next, city.id, weakTarget.id, faction.aiStyle === "aggressive" ? "cavalry" : "auto");
        const tacticalChoices = createAutoTacticalChoices(next, city.id, weakTarget.id, formation, "ai", faction.aiStyle === "aggressive" ? "deep" : "standard");
        const result = resolveBattle(next, city.id, weakTarget.id, { formation, tacticalChoices, controlMode: "auto" });
        next = result.state;
        budget = { ...budget, militaryOrders: budget.militaryOrders - 2 };
        logs.push(`${faction.name}使用2军令，从${city.name}出征${weakTarget.name}：${result.report?.resultText ?? "战斗结束"}`);
        actions += 1;
        continue;
      }
      if (totalTroops(city.troops) < 1400 && city.gold >= 80 && city.food >= 80 && budget.militaryOrders >= 1) {
        next = aiRecruit(next, city);
        budget = { ...budget, militaryOrders: budget.militaryOrders - 1 };
        logs.push(`${faction.name}使用1军令，在${city.name}征兵备战`);
        actions += 1;
        continue;
      }
      if (budget.politicalOrders < 1) break;
      if (faction.aiStyle === "defensive") {
        next = aiDevelop(next, city, "defense");
        logs.push(`${faction.name}使用1政令，修筑${city.name}城防`);
      } else if (faction.aiStyle === "economic") {
        next = aiDevelop(next, city, city.commerce < city.agriculture ? "commerce" : "agriculture");
        logs.push(`${faction.name}使用1政令，发展${city.name}民生`);
      } else {
        next = aiDevelop(next, city, Math.random() > 0.5 ? "agriculture" : "commerce");
        logs.push(`${faction.name}使用1政令，经营${city.name}`);
      }
      budget = { ...budget, politicalOrders: budget.politicalOrders - 1 };
      actions += 1;
    }
  }
  return { state: next, logs: state.commandPreferences?.aiBattleLogLevel === "brief" ? logs.filter((log) => log.includes("出征")).slice(0, 8) : logs.slice(0, 18) };
};
