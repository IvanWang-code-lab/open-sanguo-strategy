import type { CityId, ScenarioData } from "../types/scenario";
import type {
PrototypeControllerActionResult,
PrototypeControllerState,
} from "./prototypeController";
import {
endPrototypeControllerTurn,
refreshPrototypeControllerViewModel,
selectPrototypeControllerCity,
} from "./prototypeController";

export type PrototypeCommand =
| {
type: "select-city";
cityId: CityId;
}
| {
type: "end-turn";
}
| {
type: "refresh-view";
};

export interface PrototypeCommandResult {
command: PrototypeCommand;
previousState: PrototypeControllerState;
nextState: PrototypeControllerState;
message: string;
didChangeState: boolean;
}

export function executePrototypeCommand(
scenario: ScenarioData,
current: PrototypeControllerState,
command: PrototypeCommand
): PrototypeCommandResult {
switch (command.type) {
case "select-city":
return createCommandResultFromAction(
command,
selectPrototypeControllerCity(scenario, current, command.cityId)
);

```
case "end-turn":
  return createCommandResultFromAction(
    command,
    endPrototypeControllerTurn(scenario, current)
  );

case "refresh-view": {
  const nextState = refreshPrototypeControllerViewModel(scenario, current);

  return {
    command,
    previousState: current,
    nextState,
    message: "Refreshed prototype view model.",
    didChangeState: false,
  };
}

default:
  return assertNever(command);
```

}
}

export function executePrototypeCommands(
scenario: ScenarioData,
initialState: PrototypeControllerState,
commands: PrototypeCommand[]
): PrototypeCommandResult[] {
const results: PrototypeCommandResult[] = [];
let currentState = initialState;

for (const command of commands) {
const result = executePrototypeCommand(scenario, currentState, command);
results.push(result);
currentState = result.nextState;
}

return results;
}

export function createSelectCityCommand(cityId: CityId): PrototypeCommand {
return {
type: "select-city",
cityId,
};
}

export function createEndTurnCommand(): PrototypeCommand {
return {
type: "end-turn",
};
}

export function createRefreshViewCommand(): PrototypeCommand {
return {
type: "refresh-view",
};
}

function createCommandResultFromAction(
command: PrototypeCommand,
actionResult: PrototypeControllerActionResult
): PrototypeCommandResult {
return {
command,
previousState: actionResult.previousState,
nextState: actionResult.nextState,
message: actionResult.message,
didChangeState: true,
};
}

function assertNever(value: never): never {
throw new Error(`Unsupported prototype command: ${JSON.stringify(value)}`);
}
