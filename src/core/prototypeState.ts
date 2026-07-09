import type {
CityId,
FactionId,
GameTurnState,
ScenarioCity,
ScenarioData,
ScenarioFaction,
ScenarioOfficer,
} from "../types/scenario";
import {
getCitiesByFactionId,
getFactionById,
getOfficersByFactionId,
} from "../types/scenario";
import {
advanceTurn,
createInitialTurnState,
type TurnAdvanceResult,
} from "./turnSystem";

export interface PrototypeGameState {
scenarioId: string;
turn: GameTurnState;
selectedCityId?: CityId;
log: PrototypeGameLogEntry[];
}

export interface PrototypeGameLogEntry {
turn: number;
factionId: FactionId;
message: string;
}

export interface PrototypeFactionSummary {
faction: ScenarioFaction;
cities: ScenarioCity[];
officers: ScenarioOfficer[];
}

export interface PrototypeStateSummary {
currentTurn: number;
activeFaction?: ScenarioFaction;
selectedCity?: ScenarioCity;
factions: PrototypeFactionSummary[];
log: PrototypeGameLogEntry[];
}

export function createInitialPrototypeState(
scenario: ScenarioData
): PrototypeGameState {
const initialTurnState = createInitialTurnState(scenario);

return {
scenarioId: scenario.id,
turn: initialTurnState,
selectedCityId: scenario.cities[0]?.id,
log: [
{
turn: initialTurnState.currentTurn,
factionId: initialTurnState.activeFactionId,
message: "Prototype scenario initialized.",
},
],
};
}

export function selectCity(
state: PrototypeGameState,
cityId: CityId
): PrototypeGameState {
return {
...state,
selectedCityId: cityId,
log: [
...state.log,
{
turn: state.turn.currentTurn,
factionId: state.turn.activeFactionId,
message: `Selected city: ${cityId}.`,
},
],
};
}

export function advancePrototypeTurn(
scenario: ScenarioData,
state: PrototypeGameState
): {
state: PrototypeGameState;
result: TurnAdvanceResult;
} {
const result = advanceTurn(scenario, state.turn);

const nextState: PrototypeGameState = {
...state,
turn: result.nextState,
log: [
...state.log,
{
turn: result.nextState.currentTurn,
factionId: result.nextFactionId,
message: result.didAdvanceTurn
? `Advanced to turn ${result.nextState.currentTurn}.`
: `Active faction changed to ${result.nextFactionId}.`,
},
],
};

return {
state: nextState,
result,
};
}

export function summarizePrototypeState(
scenario: ScenarioData,
state: PrototypeGameState
): PrototypeStateSummary {
const activeFaction = getFactionById(
scenario,
state.turn.activeFactionId
);

const selectedCity = state.selectedCityId
? scenario.cities.find((city) => city.id === state.selectedCityId)
: undefined;

const factions = scenario.factions.map((faction) => ({
faction,
cities: getCitiesByFactionId(scenario, faction.id),
officers: getOfficersByFactionId(scenario, faction.id),
}));

return {
currentTurn: state.turn.currentTurn,
activeFaction,
selectedCity,
factions,
log: state.log,
};
}
