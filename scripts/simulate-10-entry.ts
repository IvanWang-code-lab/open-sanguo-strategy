import { getAttackTargets, performCityAction } from "../src/systems/citySystem";
import { actionLabels, getCommandCost, spendPlayerCommand } from "../src/systems/commandSystem";
import { createAutoFormation } from "../src/systems/armyFormationSystem";
import { createAutoTacticalChoices } from "../src/systems/battleTacticsSystem";
import { resolveBattle } from "../src/systems/battleSystem";
import { createInitialGame } from "../src/systems/scenarioSystem";
import { endTurn } from "../src/systems/turnSystem";
import { totalTroops } from "../src/systems/unitSystem";
import type { GameState } from "../src/types";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const assertHealthy = (state: GameState, turn: number) => {
  assert((state.commandState.commands ?? 0) >= 0, `第 ${turn} 回合指令为负`);
  const factionIds = new Set(state.factions.map((faction) => faction.id));
  for (const city of state.cities) {
    assert(factionIds.has(city.factionId), `第 ${turn} 回合城市 ${city.name} 势力非法`);
    assert(city.gold >= 0 && city.food >= 0, `第 ${turn} 回合城市 ${city.name} 资源为负`);
    assert(totalTroops(city.troops) >= 0, `第 ${turn} 回合城市 ${city.name} 兵力为负`);
  }
};

let state = createInitialGame("cao-cao");

for (let turn = 1; turn <= 10; turn += 1) {
  const politicalCity = state.cities.find((city) => city.factionId === state.playerFactionId && !city.actedThisTurn && city.gold >= 100);
  if (politicalCity && (state.commandState.commands ?? 0) > 0) {
    const action = politicalCity.publicOrder < 55 ? "pacify" : politicalCity.food < 1200 ? "agriculture" : "commerce";
    const spent = spendPlayerCommand(state, getCommandCost(action), actionLabels[action], politicalCity.name);
    if (spent.ok) state = performCityAction(spent.state, politicalCity.id, action).state;
  }

  const attackCity = state.cities.find((city) => city.factionId === state.playerFactionId && (state.commandState.commands ?? 0) >= 1 && getAttackTargets(state, city.id).length > 0);
  if (attackCity) {
    const defender = getAttackTargets(state, attackCity.id).sort((a, b) => totalTroops(a.troops) - totalTroops(b.troops))[0];
    const formation = createAutoFormation(state, attackCity.id, defender.id, "auto", defender.terrain === "river" ? "navy" : "balanced", {}, { sortiePreset: "standard", garrisonPreset: "30" });
    const spent = spendPlayerCommand(state, getCommandCost("attack"), actionLabels.attack, attackCity.name);
    if (spent.ok && formation.totalTroops >= 200) {
      const tactics = createAutoTacticalChoices(spent.state, attackCity.id, defender.id, formation, "auto", "standard");
      state = resolveBattle(spent.state, attackCity.id, defender.id, { formation, tacticalChoices: tactics, controlMode: "auto" }).state;
    }
  } else {
    const recruitCity = state.cities.find((city) => city.factionId === state.playerFactionId && (state.commandState.commands ?? 0) > 0 && city.gold >= 120 && city.food >= 120);
    if (recruitCity) {
      const spent = spendPlayerCommand(state, getCommandCost("recruit"), actionLabels.recruit, recruitCity.name);
      if (spent.ok) state = performCityAction(spent.state, recruitCity.id, "recruit").state;
    }
  }

  state = endTurn(state);
  assertHealthy(state, turn);
}

console.log("simulate:10 通过：190 曹操自动模拟 10 回合，AI、指令、战斗和城市状态均未崩溃。");
