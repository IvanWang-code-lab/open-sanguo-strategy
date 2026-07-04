import type { CityId, ScenarioData } from "../types/scenario";
import type { PrototypeGameState } from "./prototypeState";
import {
advancePrototypeTurn,
createInitialPrototypeState,
selectCity,
summarizePrototypeState,
} from "./prototypeState";
import type { PrototypeViewModel } from "./prototypeViewModel";
import { createPrototypeViewModel } from "./prototypeViewModel";

export interface PrototypeControllerState {
gameState: PrototypeGameState;
viewModel: PrototypeViewModel;
}

export interface PrototypeControllerActionResult {
previousState: PrototypeControllerState;
nextState: PrototypeControllerState;
message: string;
}

export function createPrototypeControllerState(
scenario: ScenarioData
): PrototypeControllerState {
const gameState = createInitialPrototypeState(scenario);
const summary = summarizePrototypeState(scenario, gameState);
const viewModel = createPrototypeViewModel(scenario, summary);

return {
gameState,
viewModel,
};
}

export function selectPrototypeControllerCity(
scenario: ScenarioData,
current: PrototypeControllerState,
cityId: CityId
): PrototypeControllerActionResult {
const nextGameState = selectCity(current.gameState, cityId);
const nextState = createControllerStateFromGameState(
scenario,
nextGameState
);

return {
previousState: current,
nextState,
message: `Selected city ${cityId}.`,
};
}

export function endPrototypeControllerTurn(
scenario: ScenarioData,
current: PrototypeControllerState
): PrototypeControllerActionResult {
const turnResult = advancePrototypeTurn(scenario, current.gameState);
const nextState = createControllerStateFromGameState(
scenario,
turnResult.state
);

return {
previousState: current,
nextState,
message: turnResult.result.didAdvanceTurn
? `Advanced to turn ${turnResult.result.nextState.currentTurn}.`
: `Active faction changed to ${turnResult.result.nextFactionId}.`,
};
}

export function refreshPrototypeControllerViewModel(
scenario: ScenarioData,
current: PrototypeControllerState
): PrototypeControllerState {
return createControllerStateFromGameState(scenario, current.gameState);
}

function createControllerStateFromGameState(
scenario: ScenarioData,
gameState: PrototypeGameState
): PrototypeControllerState {
const summary = summarizePrototypeState(scenario, gameState);
const viewModel = createPrototypeViewModel(scenario, summary);

return {
gameState,
viewModel,
};
}
