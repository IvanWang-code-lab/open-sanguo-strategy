import type { CityId, ScenarioData } from "../types/scenario";
import type {
PrototypeControllerActionResult,
PrototypeControllerState,
} from "./prototypeController";
import {
createPrototypeControllerState,
endPrototypeControllerTurn,
selectPrototypeControllerCity,
} from "./prototypeController";

export interface PrototypeControllerExampleResult {
initialState: PrototypeControllerState;
selectedCityResult?: PrototypeControllerActionResult;
endTurnResult: PrototypeControllerActionResult;
summaryLines: string[];
}

export function runPrototypeControllerExample(
scenario: ScenarioData,
cityIdToSelect?: CityId
): PrototypeControllerExampleResult {
const initialState = createPrototypeControllerState(scenario);

const selectedCityResult = cityIdToSelect
? selectPrototypeControllerCity(scenario, initialState, cityIdToSelect)
: undefined;

const stateBeforeEndTurn = selectedCityResult?.nextState ?? initialState;
const endTurnResult = endPrototypeControllerTurn(
scenario,
stateBeforeEndTurn
);

return {
initialState,
selectedCityResult,
endTurnResult,
summaryLines: createPrototypeControllerExampleSummaryLines(
scenario,
initialState,
selectedCityResult,
endTurnResult
),
};
}

export function createPrototypeControllerExampleSummaryLines(
scenario: ScenarioData,
initialState: PrototypeControllerState,
selectedCityResult: PrototypeControllerActionResult | undefined,
endTurnResult: PrototypeControllerActionResult
): string[] {
const lines: string[] = [
`Scenario: ${scenario.name}`,
`Initial state: ${initialState.viewModel.currentTurnLabel}`,
initialState.viewModel.activeFactionLabel,
initialState.viewModel.selectedCityLabel,
];

if (selectedCityResult) {
lines.push(`City selection action: ${selectedCityResult.message}`);
lines.push(
`Selected city after action: ${selectedCityResult.nextState.viewModel.selectedCityLabel}`
);
} else {
lines.push("No city selection action was provided.");
}

lines.push(`End turn action: ${endTurnResult.message}`);
lines.push(
`State after end turn: ${endTurnResult.nextState.viewModel.currentTurnLabel}`
);
lines.push(endTurnResult.nextState.viewModel.activeFactionLabel);

return lines;
}

export function getPrototypeControllerExampleLogLines(
result: PrototypeControllerExampleResult
): string[] {
return result.endTurnResult.nextState.viewModel.logs.map(
(entry) => `${entry.label}: ${entry.message}`
);
}
