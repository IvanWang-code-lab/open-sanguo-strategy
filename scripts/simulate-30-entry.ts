import { getAttackTargets, performCityAction } from "../src/systems/citySystem";
import { actionLabels, getCommandCost, spendPlayerCommand } from "../src/systems/commandSystem";
import { createAutoFormation } from "../src/systems/armyFormationSystem";
import { createAutoTacticalChoices } from "../src/systems/battleTacticsSystem";
import { resolveBattle } from "../src/systems/battleSystem";
import { createInitialGame } from "../src/systems/scenarioSystem";
import { endTurn } from "../src/systems/turnSystem";
import { totalTroops } from "../src/systems/unitSystem";
import type { GameState, Troops } from "../src/types";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const assertTroopsHealthy = (troops: Troops, label: string) => {
  for (const [type, value] of Object.entries(troops)) {
    assert(Number.isFinite(value) && value >= 0, `${label} ${type} troops invalid: ${value}`);
  }
};

const assertHealthy = (state: GameState, turn: number) => {
  assert((state.commandState.commands ?? 0) >= 0, `turn ${turn}: commands below zero`);
  assert(Number.isFinite(state.commandState.commandEfficiency), `turn ${turn}: command efficiency invalid`);
  assert(Array.isArray(state.regionObjectives), `turn ${turn}: region objectives missing`);
  assert(Array.isArray(state.eventHistory), `turn ${turn}: event history missing`);

  const factionIds = new Set(state.factions.map((faction) => faction.id));
  for (const city of state.cities) {
    assert(factionIds.has(city.factionId), `turn ${turn}: city ${city.id} faction invalid`);
    assert(Number.isFinite(city.gold) && city.gold >= 0, `turn ${turn}: city ${city.name} gold invalid`);
    assert(Number.isFinite(city.food) && city.food >= 0, `turn ${turn}: city ${city.name} food invalid`);
    assert(Number.isFinite(city.cityFatigue ?? 0), `turn ${turn}: city ${city.name} fatigue invalid`);
    assertTroopsHealthy(city.troops, `turn ${turn}: city ${city.name}`);
    assert(totalTroops(city.troops) >= 0, `turn ${turn}: city ${city.name} total troops invalid`);
  }
};

let state = createInitialGame("cao-cao", "190");
let battleCount = 0;
let eventCount = 0;

for (let turn = 1; turn <= 30; turn += 1) {
  const politicalCity = state.cities.find((city) => city.factionId === state.playerFactionId && !city.actedThisTurn && city.gold >= 100);
  if (politicalCity && (state.commandState.commands ?? 0) > 0) {
    const action = politicalCity.publicOrder < 58 ? "pacify" : (politicalCity.cityFatigue ?? 0) > 45 ? "rest" : politicalCity.food < 1500 ? "agriculture" : "commerce";
    const spent = spendPlayerCommand(state, getCommandCost(action), actionLabels[action], politicalCity.name);
    if (spent.ok) state = performCityAction(spent.state, politicalCity.id, action).state;
  }

  const attackCity = state.cities.find((city) => {
    if (city.factionId !== state.playerFactionId || (state.commandState.commands ?? 0) < 1) return false;
    if (totalTroops(city.troops) < 1300 || (city.cityFatigue ?? 0) > 70) return false;
    return getAttackTargets(state, city.id).length > 0;
  });

  if (attackCity) {
    const defender = getAttackTargets(state, attackCity.id).sort((a, b) => totalTroops(a.troops) - totalTroops(b.troops))[0];
    const formation = createAutoFormation(state, attackCity.id, defender.id, "auto", defender.terrain === "river" ? "navy" : "balanced", {}, { sortiePreset: "standard", garrisonPreset: "30" });
    const spent = spendPlayerCommand(state, getCommandCost("attack"), actionLabels.attack, attackCity.name);
    if (spent.ok && formation.totalTroops >= 200) {
      const tactics = createAutoTacticalChoices(spent.state, attackCity.id, defender.id, formation, "auto", "standard");
      const battle = resolveBattle(spent.state, attackCity.id, defender.id, { formation, tacticalChoices: tactics, controlMode: "auto" });
      state = battle.state;
      battleCount += 1;
    }
  } else {
    const militaryCity = state.cities.find((city) => city.factionId === state.playerFactionId && (state.commandState.commands ?? 0) > 0 && city.gold >= 120 && city.food >= 120);
    if (militaryCity) {
      const action = militaryCity.morale < 68 || (militaryCity.cityFatigue ?? 0) > 45 ? "train" : "recruit";
      const spent = spendPlayerCommand(state, getCommandCost(action), actionLabels[action], militaryCity.name);
      if (spent.ok) state = performCityAction(spent.state, militaryCity.id, action).state;
    }
  }

  state = endTurn(state);
  eventCount = Math.max(eventCount, state.eventHistory?.length ?? 0);
  assertHealthy(state, turn);
}

assert(state.regionObjectives.length > 0, "region objectives were not generated");
assert(eventCount > 0, "world events were not generated during 30-turn simulation");

console.log(`simulate:30 passed: 30 turns completed, battles=${battleCount}, events=${eventCount}.`);
