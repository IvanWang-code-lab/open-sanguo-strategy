import type { ScenarioData } from "../types/scenario";
import type {
ScenarioValidationIssue,
ScenarioValidationResult,
} from "./scenarioValidation";
import { validateScenarioData } from "./scenarioValidation";

export interface ScenarioValidationExampleReport {
isValid: boolean;
errorCount: number;
warningCount: number;
summaryLines: string[];
errors: string[];
warnings: string[];
}

export function createScenarioValidationExampleReport(
scenario: ScenarioData
): ScenarioValidationExampleReport {
const validation = validateScenarioData(scenario);

return {
isValid: validation.isValid,
errorCount: validation.errors.length,
warningCount: validation.warnings.length,
summaryLines: createValidationSummaryLines(scenario, validation),
errors: formatValidationIssues(validation.errors),
warnings: formatValidationIssues(validation.warnings),
};
}

export function createValidationSummaryLines(
scenario: ScenarioData,
validation: ScenarioValidationResult
): string[] {
const lines: string[] = [
`Scenario: ${scenario.name}`,
`Scenario id: ${scenario.id}`,
`Factions: ${scenario.factions.length}`,
`Cities: ${scenario.cities.length}`,
`Officers: ${scenario.officers.length}`,
`Validation status: ${validation.isValid ? "valid" : "invalid"}`,
`Errors: ${validation.errors.length}`,
`Warnings: ${validation.warnings.length}`,
];

if (validation.isValid) {
lines.push("Scenario data can be used to bootstrap the prototype.");
} else {
lines.push("Scenario data should be fixed before starting the prototype.");
}

return lines;
}

export function formatValidationIssues(
issues: ScenarioValidationIssue[]
): string[] {
if (issues.length === 0) {
return ["No issues found."];
}

return issues.map(
(issue) => `[${issue.severity}:${issue.code}] ${issue.message}`
);
}

export function hasBlockingScenarioIssues(scenario: ScenarioData): boolean {
return validateScenarioData(scenario).errors.length > 0;
}
