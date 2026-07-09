import { getAttackTargets, performCityAction } from "../src/systems/citySystem";
import { actionLabels, getCommandCost, spendPlayerCommand } from "../src/systems/commandSystem";
import { createAutoFormation } from "../src/systems/armyFormationSystem";
import { createBattlefieldState } from "../src/systems/battlefieldSystem";
import { applyBattlefieldResult } from "../src/systems/battleResolutionSystem";
import { executeBattleRound } from "../src/systems/unitCommandSystem";
import { createInitialGame } from "../src/systems/scenarioSystem";
import { endTurn } from "../src/systems/turnSystem";
import { totalTroops } from "../src/systems/unitSystem";
import type { GameState } from "../src/types";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const assertHealthy = (state: GameState, turn: number) => {
  const liuBeiCities = state.cities.filter((city) => city.factionId === "liu-bei");
  assert(liuBeiCities.length > 0, `第 ${turn} 回合刘备势力灭亡`);
  assert((state.commandState.commands ?? 0) >= 0, `第 ${turn} 回合指令为负`);
  for (const city of state.cities) {
    assert(Number.isFinite(city.gold) && city.gold >= 0, `第 ${turn} 回合 ${city.name} 金钱非法`);
    assert(Number.isFinite(city.food) && city.food >= 0, `第 ${turn} 回合 ${city.name} 粮草非法`);
    assert(totalTroops(city.troops) >= 0, `第 ${turn} 回合 ${city.name} 兵力非法`);
  }
};

let state = createInitialGame("liu-bei", "190");
assertHealthy(state, 0);

for (let turn = 1; turn <= 12; turn += 1) {
  const liuCities = state.cities.filter((city) => city.factionId === "liu-bei");
  const core = liuCities.find((city) => !city.actedThisTurn) ?? liuCities[0];
  if (core && (state.commandState.commands ?? 0) > 0) {
    const action = core.publicOrder < 70 ? "pacify" : core.food < 1500 ? "agriculture" : "commerce";
    const spent = spendPlayerCommand(state, getCommandCost(action), actionLabels[action], core.name);
    if (spent.ok) state = performCityAction(spent.state, core.id, action).state;
  }

  const recruitCity = state.cities.find((city) => city.factionId === "liu-bei" && (state.commandState.commands ?? 0) > 0 && city.gold >= 120 && city.food >= 120);
  if (recruitCity) {
    const spent = spendPlayerCommand(state, getCommandCost("recruit"), actionLabels.recruit, recruitCity.name);
    if (spent.ok) state = performCityAction(spent.state, recruitCity.id, "recruit").state;
  }

  const canProbe = (state.commandState.commands ?? 0) >= 1;
  const attacker = canProbe
    ? state.cities.find((city) => city.factionId === "liu-bei" && !city.actedThisTurn && totalTroops(city.troops) >= 2600 && getAttackTargets(state, city.id).length > 0)
    : undefined;
  if (attacker) {
    const defender = getAttackTargets(state, attacker.id).sort((a, b) => totalTroops(a.troops) - totalTroops(b.troops))[0];
    const formation = createAutoFormation(state, attacker.id, defender.id, "steady", "balanced", {}, { sortiePreset: "probe", garrisonPreset: "50" });
    const spent = spendPlayerCommand(state, getCommandCost("attack"), actionLabels.attack, attacker.name);
    if (spent.ok && formation.totalTroops >= 400) {
      let battlefield = createBattlefieldState(spent.state, { attackerCityId: attacker.id, defenderCityId: defender.id, formation, controlMode: "autoWatch" }, "autoWatch");
      while (!battlefield.result && battlefield.round <= battlefield.maxRounds + 1) battlefield = executeBattleRound(spent.state, battlefield);
      state = applyBattlefieldResult(spent.state, { attackerCityId: attacker.id, defenderCityId: defender.id, formation, controlMode: "autoWatch" }, battlefield).state;
    }
  }

  state = endTurn(state);
  assertHealthy(state, turn);
}

const liuBeiCityNames = state.cities.filter((city) => city.factionId === "liu-bei").map((city) => city.name).join("、");
console.log(`simulate:liubei:12 通过：190 刘备普通开局连续 12 回合存活，当前城池：${liuBeiCityNames}`);
