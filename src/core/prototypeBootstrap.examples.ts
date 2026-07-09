import type { ScenarioData } from "../types/scenario";
import type { PrototypeStateSummary } from "./prototypeState";
import {
advancePrototypeTurn,
summarizePrototypeState,
} from "./prototypeState";
import { bootstrapPrototypeScenario } from "./prototypeBootstrap";

export interface PrototypeBootstrapExampleResult {
canStart: boolean;
startupMessages: string[];
initialSummary?: PrototypeStateSummary;
afterOneTurnSummary?: PrototypeStateSummary;
}

export function runPrototypeBootstrapExample(
scenario: ScenarioData
): PrototypeBootstrapExampleResult {
const bootstrapResult = bootstrapPrototypeScenario(scenario);

if (!bootstrapResult.canStart || !bootstrapResult.state) {
return {
canStart: false,
startupMessages: bootstrapResult.startupMessages,
};
}

const firstTurnResult = advancePrototypeTurn(
scenario,
bootstrapResult.state
);

return {
canStart: true,
startupMessages: [
...bootstrapResult.startupMessages,
`Example advanced from faction ${firstTurnResult.result.previousFactionId} to ${firstTurnResult.result.nextFactionId}.`,
],
initialSummary: bootstrapResult.summary,
afterOneTurnSummary: summarizePrototypeState(
scenario,
firstTurnResult.state
),
};
}

export function formatPrototypeExampleSummary(
result: PrototypeBootstrapExampleResult
): string[] {
if (!result.canStart) {
return [
"Prototype example could not start.",
...result.startupMessages,
];
}

const activeFactionName =
result.initialSummary?.activeFaction?.name ?? "Unknown faction";

const nextActiveFactionName =
result.afterOneTurnSummary?.activeFaction?.name ?? "Unknown faction";

return [
"Prototype example started successfully.",
...result.startupMessages,
`Initial active faction: ${activeFactionName}.`,
`Active faction after one turn step: ${nextActiveFactionName}.`,
];
}
