export type TroopType = "infantry" | "cavalry" | "archer" | "navy";
export type TerrainType = "plain" | "mountain" | "river" | "forest" | "city";
export type WeatherType = "sunny" | "rain" | "fog" | "snow";
export type AiStyle = "aggressive" | "defensive" | "economic" | "balanced";
export type GeneralStatus = "active" | "wild" | "locked" | "captured" | "dead";
export type SkillType = "active" | "passive" | "city";
export type SkillTrigger = "battle_start" | "attack" | "defend" | "random" | "city_turn";
export type CityActionType = "recruit" | "agriculture" | "commerce" | "defense" | "train" | "search" | "pacify" | "scout";
export type BattleControlMode = "auto" | "standard" | "deep";
export type BattleSpeed = "normal" | "fast";
export type AiBattleLogLevel = "important" | "brief";
export type FormationStyle = "auto" | "cavalry" | "archer" | "steady" | "siege";
export type FormationTroopPreference = "balanced" | "infantry" | "cavalry" | "archer" | "navy" | "siege";
export type BattlePhase = "deployment" | "probe" | "clash" | "breakthrough" | "resolution";

export interface Troops {
  infantry: number;
  cavalry: number;
  archer: number;
  navy: number;
}

export interface Faction {
  id: string;
  name: string;
  color: string;
  ruler: string;
  capital: string;
  isPlayer: boolean;
  aiStyle: AiStyle;
  description: string;
  difficulty: string;
}

export interface City {
  id: string;
  name: string;
  x: number;
  y: number;
  factionId: string;
  terrain: TerrainType;
  troops: Troops;
  gold: number;
  food: number;
  agriculture: number;
  commerce: number;
  defense: number;
  morale: number;
  publicOrder: number;
  actedThisTurn: boolean;
  generals: string[];
}

export interface General {
  id: string;
  name: string;
  factionId: string;
  locationCityId: string;
  force: number;
  intelligence: number;
  command: number;
  politics: number;
  charm: number;
  loyalty: number;
  level: number;
  exp: number;
  skills: string[];
  status: GeneralStatus;
  appearYear: number;
  appearMonth: number;
}

export interface Skill {
  id: string;
  name: string;
  type: SkillType;
  trigger: SkillTrigger;
  effect: string;
  description: string;
}

export interface CommandState {
  politicalOrders: number;
  maxPoliticalOrders: number;
  militaryOrders: number;
  maxMilitaryOrders: number;
  commandEfficiency: number;
  governanceLoad: number;
  averagePublicOrder: number;
  advisory: string;
  politicalBreakdown?: CommandBreakdown;
  militaryBreakdown?: CommandBreakdown;
  usedOrders?: number;
  remainingActionableCities?: number;
  recommendations?: string[];
}

export interface CommandCost {
  political: number;
  military: number;
}

export interface CommandBreakdown {
  base: number;
  cityBonus: number;
  rulerBonus: number;
  factionBonus: number;
  governancePenalty: number;
  final: number;
  detail: string[];
}

export interface TroopAssignment {
  generalId: string;
  role: "commander" | "advisor" | "vanguard" | "left" | "right" | "reserve";
  infantry: number;
  cavalry: number;
  archer: number;
  navy: number;
  total: number;
  capacity: number;
  efficiency: number;
}

export interface ArmyFormation {
  commanderId?: string;
  advisorId?: string;
  vanguardGeneralId?: string;
  leftGeneralId?: string;
  rightGeneralId?: string;
  reserveGeneralId?: string;
  troopAssignments: TroopAssignment[];
  formationStyle: FormationStyle;
  troopPreference?: FormationTroopPreference;
  tacticStyle: string;
  attackDirection: "center" | "left" | "right" | "balanced";
  totalTroops: number;
  capacityPressure: number;
  scores?: FormationScores;
  summary: string;
}

export interface FormationRoleOverrides {
  commanderId?: string;
  advisorId?: string;
  vanguardGeneralId?: string;
  leftGeneralId?: string;
  rightGeneralId?: string;
  reserveGeneralId?: string;
}

export interface FormationScores {
  militaryPower: number;
  opportunity: number;
  breakthrough: number;
  stability: number;
  expectedLossRisk: number;
  rating: "S" | "A" | "B" | "C";
  advice: string;
}

export interface BattleTacticalEffects {
  momentum: number;
  opportunity: number;
  breakthrough: number;
  morale: number;
  lossRisk: number;
  enemyMomentum?: number;
  pressure?: number;
}

export interface BattleTacticalChoice {
  phase: BattlePhase;
  choiceId: string;
  label: string;
  chosenBy: "player" | "ai" | "auto";
  supportingGeneralId?: string;
  success: boolean;
  effects: BattleTacticalEffects;
  description: string;
  requirements?: string[];
  predictedEffects?: string;
  actualEffects?: string;
  recommendedWhen?: string;
  riskLevel?: "低" | "中" | "高";
}

export interface PendingBattle {
  attackerCityId: string;
  defenderCityId: string;
  formation: ArmyFormation;
  controlMode: BattleControlMode;
}

export interface BattleReport {
  id: string;
  attackerFactionId: string;
  defenderFactionId: string;
  attackerCityName: string;
  defenderCityName: string;
  attackerGeneralId?: string;
  defenderGeneralId?: string;
  attackerGeneral: string;
  defenderGeneral: string;
  defenderTerrain: TerrainType;
  defenderDefense: number;
  attackerStart: number;
  defenderStart: number;
  attackerLoss: number;
  defenderLoss: number;
  attackerRemaining: number;
  defenderRemaining: number;
  attackerMorale: number;
  defenderMorale: number;
  winner: "attacker" | "defender";
  occupied: boolean;
  skillMessages: string[];
  resultText: string;
  mvpText: string;
  expMessages: string[];
  armyFormation?: ArmyFormation;
  tacticalChoices?: BattleTacticalChoice[];
  battleTimeline?: string[];
  keyFactors?: string[];
  nextAdvice?: string;
  commandGrade?: "S" | "A" | "B" | "C";
  commanderContribution?: string;
  advisorContribution?: string;
  wingContributions?: string[];
  commandScore?: number;
  playerControlSummary?: string;
}

export interface GameState {
  version: string;
  playerFactionId: string;
  year: number;
  month: number;
  currentWeather: WeatherType;
  factions: Faction[];
  cities: City[];
  generals: General[];
  logs: string[];
  commandState: CommandState;
  currentTurnCommandsUsed: string[];
  battleControlMode: BattleControlMode;
  commandPreferences: CommandPreferences;
  lastBattle?: BattleReport;
}

export interface CommandPreferences {
  battleControlMode: BattleControlMode;
  battleSpeed: BattleSpeed;
  aiBattleLogLevel: AiBattleLogLevel;
}

export const troopLabels: Record<TroopType, string> = {
  infantry: "步兵",
  cavalry: "骑兵",
  archer: "弓兵",
  navy: "水军",
};

export const terrainLabels: Record<TerrainType, string> = {
  plain: "平原",
  mountain: "山地",
  river: "江河",
  forest: "林地",
  city: "城池",
};

export const weatherLabels: Record<WeatherType, string> = {
  sunny: "晴",
  rain: "雨",
  fog: "雾",
  snow: "雪",
};
