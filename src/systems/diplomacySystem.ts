import type { GameState } from "../types";

export interface DiplomacyState {
  relations: Record<string, number>;
}

// V0.1 预留外交接口，后续可接入同盟、停战、劝降等逻辑。
export const getDiplomacyHint = (_state: GameState) => "外交系统将在后续版本扩展";
