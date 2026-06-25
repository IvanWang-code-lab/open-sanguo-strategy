import type { PrototypeGameState, PrototypeStateSummary } from "./prototypeState";
import {
createInitialPrototypeState,
summarizePrototypeState,
} from "./prototypeState";
import type { ScenarioData } from "../types/scenario";
import type { ScenarioValidationResult } from "./scenarioValidation";
import { validateScenarioData } from "./scenarioValidation";

export interface PrototypeBootstrapResult {
canStart: boolean;
validation: ScenarioValidationResult;
state?: PrototypeGameState;
summary?: PrototypeStateSummary;
startupMessages: string[];
}

export function bootstrapPrototypeScenario(
scenario: ScenarioData
): PrototypeBootstrapResult {
const validation = validateScenarioData(scenario);
const startupMessages = createStartupMessages(validation);

if (!validation.isValid) {
return {
canStart: false,
validation,
startupMessages,
};
}

const state = createInitialPrototypeState(scenario);
const summary = summarizePrototypeState(scenario, state);

return {
canStart: true,
validation,
state,
summary,
startupMessages: [
...startupMessages,
`Prototype scenario ready: ${scenario.name}.`,
`Initial turn: ${state.turn.currentTurn}.`,
`Initial active faction: ${state.turn.activeFactionId}.`,
],
};
}

export function createStartupMessages(
validation: ScenarioValidationResult
): string[] {
const messages: string[] = [];

if (validation.isValid) {
messages.push("Scenario validation passed.");
} else {
messages.push("Scenario validation failed.");
}

for (const error of validation.errors) {
messages.push(`[error:${error.code}] ${error.message}`);
}

for (const warning of validation.warnings) {
messages.push(`[warning:${warning.code}] ${warning.message}`);
}

if (validation.warnings.length === 0 && validation.errors.length === 0) {
messages.push("No validation issues found.");
}

return messages;
}

export function canStartPrototypeScenario(scenario: ScenarioData): boolean {
return validateScenarioData(scenario).isValid;
}
