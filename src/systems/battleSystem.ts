import { createAutoFormation } from "./armyFormationSystem";
import { createBattlefieldState } from "./battlefieldSystem";
import { applyBattlefieldResult } from "./battleResolutionSystem";
import { executeBattleRound } from "./unitCommandSystem";
import type { ArmyFormation, BattleControlMode, BattleTacticalChoice, GameState, PendingBattle } from "../types";

interface ResolveBattleOptions {
  formation?: ArmyFormation;
  tacticalChoices?: BattleTacticalChoice[];
  controlMode?: BattleControlMode;
}

/**
 * Legacy API compatibility wrapper.
 * 快速结算与脚本不再维护第二套战果回写，而是驱动经典战场后进入统一 BattleOutcome 流程。
 */
export const resolveBattle = (
  state: GameState,
  attackerCityId: string,
  defenderCityId: string,
  options: ResolveBattleOptions = {},
) => {
  const formation = options.formation ?? createAutoFormation(state, attackerCityId, defenderCityId);
  const pendingBattle: PendingBattle = {
    attackerCityId,
    defenderCityId,
    formation,
    controlMode: options.controlMode ?? "quick",
  };
  let battlefield = createBattlefieldState(state, pendingBattle, "autoWatch");
  for (let guard = 0; guard < 20 && !battlefield.result; guard += 1) {
    battlefield = executeBattleRound(state, battlefield);
  }
  if (!battlefield.result) {
    return {
      state,
      report: undefined,
      outcome: undefined,
      logs: ["快速结算超过安全回合上限，战果未写入。"],
    };
  }
  return applyBattlefieldResult(state, pendingBattle, battlefield);
};

