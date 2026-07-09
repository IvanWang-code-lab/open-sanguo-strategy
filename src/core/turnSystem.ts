import type { FactionId, GameTurnState, ScenarioData } from "../types/scenario";

export interface TurnAdvanceResult {
previousState: GameTurnState;
nextState: GameTurnState;
previousFactionId: FactionId;
nextFactionId: FactionId;
didAdvanceTurn: boolean;
}

export function createInitialTurnState(scenario: ScenarioData): GameTurnState {
return {
currentTurn: scenario.initialTurn,
activeFactionId: scenario.initialActiveFactionId,
};
}

export function getActiveFactionIndex(
scenario: ScenarioData,
activeFactionId: FactionId
): number {
return scenario.factions.findIndex((faction) => faction.id === activeFactionId);
}

export function getNextFactionId(
scenario: ScenarioData,
activeFactionId: FactionId
): FactionId {
if (scenario.factions.length === 0) {
throw new Error("Cannot advance turn without factions.");
}

const activeIndex = getActiveFactionIndex(scenario, activeFactionId);

if (activeIndex === -1) {
return scenario.factions[0].id;
}

const nextIndex = (activeIndex + 1) % scenario.factions.length;
return scenario.factions[nextIndex].id;
}

export function shouldAdvanceTurnNumber(
scenario: ScenarioData,
activeFactionId: FactionId
): boolean {
const activeIndex = getActiveFactionIndex(scenario, activeFactionId);

if (activeIndex === -1) {
return false;
}

return activeIndex === scenario.factions.length - 1;
}

export function advanceTurn(
scenario: ScenarioData,
currentState: GameTurnState
): TurnAdvanceResult {
const nextFactionId = getNextFactionId(scenario, currentState.activeFactionId);
const didAdvanceTurn = shouldAdvanceTurnNumber(
scenario,
currentState.activeFactionId
);

const nextState: GameTurnState = {
currentTurn: didAdvanceTurn
? currentState.currentTurn + 1
: currentState.currentTurn,
activeFactionId: nextFactionId,
};

return {
previousState: currentState,
nextState,
previousFactionId: currentState.activeFactionId,
nextFactionId,
didAdvanceTurn,
};
}
