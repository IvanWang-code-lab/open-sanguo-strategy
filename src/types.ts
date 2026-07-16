export type TroopType = "infantry" | "cavalry" | "archer" | "navy";
export type TerrainType = "plain" | "mountain" | "river" | "forest" | "city";
export type WeatherType = "sunny" | "rain" | "fog" | "snow";
export type AiStyle = "aggressive" | "defensive" | "economic" | "balanced" | "opportunist";
export type GeneralStatus = "active" | "wild" | "locked" | "captured" | "dead";
export type SkillType = "active" | "passive" | "city";
export type SkillTrigger = "battle_start" | "attack" | "defend" | "random" | "city_turn";
export type CityActionType =
  | "recruit"
  | "agriculture"
  | "commerce"
  | "defense"
  | "train"
  | "search"
  | "pacify"
  | "scout"
  | "rest"
  | "market"
  | "spy"
  | "suppressBandits"
  | "autoGovern";
export type BattleControlMode = "classic" | "autoWatch" | "quick" | "auto" | "standard" | "deep";
export type BattleSpeed = "normal" | "fast";
export type AiBattleLogLevel = "important" | "brief";
export type FormationStyle = "auto" | "cavalry" | "archer" | "steady" | "siege";
export type FormationTroopPreference = "balanced" | "infantry" | "cavalry" | "archer" | "navy" | "siege";
export type BattlePhase = "deployment" | "probe" | "clash" | "breakthrough" | "resolution";
export type BattleLane = "left" | "center" | "right";
export type BattleSide = "player" | "enemy";
export type BattleUnitRole = "commander" | "advisor" | "vanguard" | "left" | "right" | "rear" | "reserve";
export type BattleCommandType = "advance" | "attack" | "defend" | "retreat" | "focus" | "wait" | "skill" | "withdraw";
export type ActiveSkillType = "attack" | "buff" | "debuff" | "tactic" | "heal" | "control" | "siege";
export type ActiveSkillTargetType = "self" | "enemyUnit" | "allyUnit" | "lane" | "allEnemy" | "allAlly" | "gate";
export type BattlefieldMode = "classic" | "autoWatch" | "quick";
export type MapMode = "normal" | "faction" | "frontline" | "publicOrder" | "military";
export type EventType = "trend" | "regional" | "talent" | "publicOrder" | "warPressure" | "commerce" | "disaster" | "anecdote" | "scenario";
export type ObjectiveCategory = "region" | "factionRoute" | "ending";
export type PostBattleSettlementMode = "splitGarrison" | "returnMain" | "allStation" | "auto";

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
  /** 旧存档兼容镜像；运行时武将位置以 General.locationCityId 为唯一权威源。 */
  generals: string[];
  cityFatigue?: number;
  woundedTroops?: number;
  recoveryHint?: string;
  banditPressure?: number;
  localUnrest?: number;
  citySpecialtyId?: string;
}

export interface General {
  id: string;
  name: string;
  factionId: string;
  /** 武将位置唯一权威源；非 active 状态允许为空字符串。 */
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
  commands?: number;
  maxCommands?: number;
  usedCommands?: number;
  politicalOrders: number;
  maxPoliticalOrders: number;
  militaryOrders: number;
  maxMilitaryOrders: number;
  usedPoliticalOrders?: number;
  usedMilitaryOrders?: number;
  commandEfficiency: number;
  governanceLoad: number;
  averagePublicOrder: number;
  advisory: string;
  commandAdvice?: string[];
  commandBreakdown?: {
    political: CommandBreakdown;
    military: CommandBreakdown;
  };
  politicalBreakdown?: CommandBreakdown;
  militaryBreakdown?: CommandBreakdown;
  usedOrders?: number;
  remainingActionableCities?: number;
  recommendations?: string[];
}

export interface CommandCost {
  commands?: number;
  political: number;
  military: number;
}

export interface CommandBreakdown {
  base: number;
  cityBonus: number;
  rulerBonus: number;
  factionBonus: number;
  policyBonus?: number;
  governancePenalty: number;
  final: number;
  detail: string[];
}

export type RiskLevel = "low" | "medium" | "high";
export type SortiePreset = "probe" | "standard" | "main" | "allIn" | "custom";
export type GarrisonPreset = "20" | "30" | "50" | "custom";

export interface ExpeditionPlan {
  sortiePreset: SortiePreset;
  garrisonPreset: GarrisonPreset;
  sortieRatio: number;
  garrisonRatio: number;
  minimumGarrison: number;
  recommendedGarrison: number;
  sortieTroops: Troops;
  garrisonTroops: Troops;
  sortieTotal: number;
  garrisonTotal: number;
  supplyCost: number;
  marchRisk: string;
  garrisonRisk: string;
  garrisonRiskLevel: RiskLevel;
  expectedLossRisk: number;
  advice: string;
}

export interface ExpeditionPlanOptions {
  sortiePreset?: SortiePreset;
  garrisonPreset?: GarrisonPreset;
  sortieRatio?: number;
  garrisonRatio?: number;
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
  sortieTroops?: Troops;
  garrisonTroops?: Troops;
  sortiePreset?: SortiePreset;
  garrisonPreset?: GarrisonPreset;
  sortieRatio?: number;
  garrisonRatio?: number;
  minimumGarrison?: number;
  recommendedGarrison?: number;
  supplyCost?: number;
  marchRisk?: string;
  garrisonRisk?: string;
  garrisonRiskLevel?: RiskLevel;
  expeditionAdvice?: string;
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
  includedGeneralIds?: string[];
  troopWeightOverrides?: Partial<Record<TroopAssignment["role"], number>>;
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
  successLevel?: "success" | "partial" | "failed" | "countered";
  effects: BattleTacticalEffects;
  description: string;
  requirements?: string[];
  predictedEffects?: string;
  actualEffects?: string;
  recommendedWhen?: string;
  riskLevel?: "低" | "中" | "高";
  predicted?: string;
  actual?: string;
  comboHint?: string;
  counterHint?: string;
  decisiveEvent?: string;
}

export interface RegionObjective {
  id: string;
  name: string;
  category: ObjectiveCategory;
  description: string;
  conditionText: string;
  progress: number;
  target: number;
  completed: boolean;
  reward: string;
  advice: string;
  relatedCityIds: string[];
}

export interface FactionRoute {
  factionId: string;
  title: string;
  steps: string[];
  currentStep: string;
  endingHint: string;
}

export interface WorldEvent {
  id: string;
  turn: number;
  year: number;
  month: number;
  type: EventType;
  title: string;
  message: string;
  importance: "normal" | "major";
  affectedCityId?: string;
  affectedFactionId?: string;
  effects: string[];
}

export type SeasonType = "spring" | "summer" | "autumn" | "winter";
export type CourtStance = "supportive" | "neutral" | "watching" | "hostile";
export type SpyNetworkLevel = "none" | "contact" | "spy" | "inside";
export type DifficultyAiLevel = "casual" | "normal" | "hard";
export type EventFrequency = "low" | "normal" | "high";
export type BattleComplexity = "simple" | "standard" | "deep";
export type AutoGovernanceMode = "off" | "advice" | "safeAuto";

export interface FactionUniqueMechanic {
  id: string;
  name: string;
  description: string;
  effects: string[];
}

export interface SeasonState {
  season: SeasonType;
  turnInSeason: number;
  advice: string;
}

export interface WeatherState {
  current: WeatherType;
  effectText: string;
}

export interface MarketGood {
  id: string;
  name: string;
  price: number;
  effect: string;
  risk?: string;
}

export interface CaravanMarketState {
  active: boolean;
  cityId?: string;
  expiresTurn: number;
  goods: MarketGood[];
  blackMarket?: boolean;
}

export interface SpyNetwork {
  cityId: string;
  ownerFactionId: string;
  level: SpyNetworkLevel;
  progress: number;
  risk: number;
  discovered?: boolean;
}

export interface TalentRumor {
  id: string;
  cityId: string;
  text: string;
  clueLevel: number;
  expiresTurn: number;
  resolved?: boolean;
}

export interface DomesticCrisis {
  id: string;
  cityId: string;
  type: "corruption" | "granaryFire" | "unrest" | "localClan" | "fatigue" | "plague" | "market";
  title: string;
  severity: number;
  handled?: boolean;
}

export interface CitySpecialty {
  cityId: string;
  name: string;
  description: string;
  effects: string[];
}

export interface WarArchiveEntry {
  id: string;
  turn: number;
  title: string;
  summary: string;
  highlights: string[];
}

export interface DifficultyRuleSet {
  aiLevel: DifficultyAiLevel;
  liubeiProtection: "off" | "standard" | "extended";
  eventFrequency: EventFrequency;
  battleComplexity: BattleComplexity;
  stratagemPower: "low" | "normal" | "high";
  captureRule: "lenient" | "normal" | "strict";
  supplyPressure: "low" | "normal" | "high";
  randomness: "historical" | "lightRandom" | "highRandom";
  autoGovernance: AutoGovernanceMode;
}

export interface TutorialState {
  enabled: boolean;
  completedSteps: string[];
  skipped?: boolean;
}

export interface PendingBattle {
  attackerCityId: string;
  defenderCityId: string;
  formation: ArmyFormation;
  controlMode: BattleControlMode;
}

export interface ActiveSkill {
  id: string;
  name: string;
  type: ActiveSkillType;
  cost: number;
  cooldown: number;
  targetType: ActiveSkillTargetType;
  range: number;
  effect: string;
  description: string;
  requiredRole?: BattleUnitRole[];
  visualText: string;
}

export interface BattleUnitStatusEffect {
  id: string;
  name: string;
  duration: number;
  attackModifier?: number;
  defenseModifier?: number;
  moraleModifier?: number;
  movementModifier?: number;
  preventedSkill?: boolean;
}

export interface BattleUnit {
  id: string;
  side: BattleSide;
  generalId: string;
  generalName: string;
  role: BattleUnitRole;
  lane: BattleLane;
  position: number;
  troops: number;
  maxTroops: number;
  morale: number;
  skillEnergy: number;
  cooldowns: Record<string, number>;
  statusEffects: BattleUnitStatusEffect[];
  currentOrder: BattleCommandType;
  targetUnitId?: string;
  skills: string[];
  unitTypeMix: Troops;
  isRouted: boolean;
  kills: number;
  losses: number;
  skillUses: number;
}

export interface BattleCommand {
  unitId: string;
  commandType: BattleCommandType;
  targetUnitId?: string;
  skillId?: string;
  lane?: BattleLane;
  issuedBy: "player" | "ai";
}

export interface BattlefieldUnitResult {
  unitId: string;
  generalName: string;
  role: BattleUnitRole;
  startTroops: number;
  remainingTroops: number;
  losses: number;
  kills: number;
  skillUses: number;
  routed: boolean;
}

export interface BattlefieldSkillRecord {
  round: number;
  unitId: string;
  generalName: string;
  skillId: string;
  skillName: string;
  target: string;
  effect: string;
}

export interface BattlefieldCommandRecord {
  round: number;
  unitId: string;
  generalName: string;
  commandType: BattleCommandType;
  target?: string;
  summary: string;
}

export interface BattlefieldResult {
  winner: "attacker" | "defender" | "draw" | "withdraw";
  outcome: "victory" | "defeat" | "draw" | "withdraw";
  occupied: boolean;
  unitResults: BattlefieldUnitResult[];
  skillRecords: BattlefieldSkillRecord[];
  commandRecords: BattlefieldCommandRecord[];
  cityChanges: string[];
  experienceGains: string[];
  summary: string;
  nextAdvice: string;
  attackerRemaining: number;
  defenderRemaining: number;
  attackerLoss: number;
  defenderLoss: number;
  cityDefenseDamage: number;
}

export interface BattlefieldState {
  battleId: string;
  round: number;
  maxRounds: number;
  terrain: TerrainType;
  weather: WeatherType;
  battleType: "field" | "siege" | "encounter";
  attackerCityId: string;
  defenderCityId: string;
  playerUnits: BattleUnit[];
  enemyUnits: BattleUnit[];
  selectedUnitId?: string;
  pendingCommands: Record<string, BattleCommand>;
  battleLog: string[];
  isPaused: boolean;
  mode: BattlefieldMode;
  cityDefense: number;
  maxCityDefense: number;
  result?: BattlefieldResult;
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
  sortieTroops?: Troops;
  garrisonTroops?: Troops;
  sortieTotal?: number;
  garrisonTotal?: number;
  supplyCost?: number;
  garrisonRisk?: string;
  garrisonRiskLevel?: RiskLevel;
  cityFatigueDelta?: number;
  battleAftermath?: string;
  recoveryHint?: string;
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
  battleTitle?: string;
  battleSummary?: string;
  historicalNarrative?: string;
  tacticStory?: string[];
  comboMessages?: string[];
  counterMessages?: string[];
  decisiveEvents?: string[];
  battlefieldResult?: BattlefieldResult;
  unitResults?: BattlefieldUnitResult[];
  skillRecords?: BattlefieldSkillRecord[];
  commandRecords?: BattlefieldCommandRecord[];
  settlementSummary?: string;
  garrisonGeneralNames?: string[];
  returnGeneralNames?: string[];
  sourceCityTroopsAfter?: number;
  targetCityTroopsAfter?: number;
}

export interface BattleOutcomeSurvivor {
  generalId: string;
  role: BattleUnitRole;
  troops: Troops;
  morale: number;
}

export interface BattleOutcome {
  battleId: string;
  sourceCityId: string;
  targetCityId: string;
  attackerFactionId: string;
  defenderFactionId: string;
  winnerFactionId: string;
  victoryType: BattlefieldResult["outcome"];
  conquered: boolean;
  participantGeneralIds: string[];
  survivingUnits: BattleOutcomeSurvivor[];
  sortieTroops: Troops;
  attackerRemainingTroops: Troops;
  defenderRemainingTroops: Troops;
  troopLosses: { attacker: number; defender: number };
  woundedGeneralIds: string[];
  capturedGeneralIds: string[];
  fatigueChanges: { sourceCity: number; targetCity: number };
  moraleChanges: { sourceCity: number; targetCity: number };
  cityDefenseAfter: number;
  experienceAwards: Record<string, number>;
  battleHistoryEntry: WarArchiveEntry;
  recommendedSettlement: PostBattleSettlementMode;
  report: BattleReport;
  logs: string[];
}

export interface PendingPostBattleSettlement {
  battleOutcomeId: string;
  sourceCityId: string;
  targetCityId: string;
  attackerFactionId: string;
  participantGeneralIds: string[];
  survivingTroopsByGeneral: Record<string, Troops>;
  unassignedSurvivingTroops: Troops;
  sourceCityRemainingTroops: Troops;
  targetCityRemainingDefense: number;
  availableSettlementModes: PostBattleSettlementMode[];
  recommendedMode: PostBattleSettlementMode;
  selectedGarrisonGeneralIds: string[];
  selectedReturnGeneralIds: string[];
  createdAtTurn: number;
}

export interface PostBattleSettlementDecision {
  mode: PostBattleSettlementMode;
  garrisonGeneralIds: string[];
  returnGeneralIds: string[];
}

export interface TransferOrder {
  id: string;
  sourceCityId: string;
  targetCityId: string;
  generalIds: string[];
  troopsByGeneral: Record<string, Troops>;
  createdAtTurn: number;
  summary: string;
}

export interface GameState {
  version: string;
  scenarioId?: string;
  scenarioName?: string;
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
  activeBattle?: BattlefieldState;
  pendingPostBattleSettlement?: PendingPostBattleSettlement;
  transfers?: TransferOrder[];
  history?: string[];
  lastBattle?: BattleReport;
  commandHistory?: string[];
  eventHistory?: WorldEvent[];
  regionObjectives?: RegionObjective[];
  factionRoute?: FactionRoute;
  imperialPrestige?: number;
  rulerReputation?: number;
  factionLegitimacy?: number;
  courtStance?: CourtStance;
  emperorControlFactionId?: string;
  factionUniqueMechanics?: Record<string, FactionUniqueMechanic>;
  seasonState?: SeasonState;
  weatherState?: WeatherState;
  caravanMarketState?: CaravanMarketState;
  spyNetworks?: Record<string, SpyNetwork>;
  talentRumors?: TalentRumor[];
  domesticCrises?: DomesticCrisis[];
  advisorTips?: string[];
  autoGovernanceSettings?: { mode: AutoGovernanceMode };
  difficultyRuleSet?: DifficultyRuleSet;
  encyclopediaSeenState?: { opened: boolean; seenEntries: string[] };
  tutorialState?: TutorialState;
  longSimStats?: { turnsSimulated: number; battles: number; events: number };
  duelRecords?: WarArchiveEntry[];
  prisonerRecords?: WarArchiveEntry[];
  woundedStates?: Record<string, number>;
  personalityTraits?: Record<string, string[]>;
  troopUpgrades?: Record<TroopType, number>;
  citySpecialties?: CitySpecialty[];
  supplyState?: { pressure: number; advice: string };
  stratagemRecords?: WarArchiveEntry[];
  factionStorylines?: Record<string, { step: number; title: string; completed: boolean }>;
  endingProgress?: { title: string; progress: number; hint: string };
  enhancedWarArchive?: WarArchiveEntry[];
  liubeiProtection?: {
    protectedUntilTurn: number;
    lastAttackedTurn?: number;
    supportTriggeredTurns?: number[];
  };
}

export interface CommandPreferences {
  battleControlMode: BattleControlMode;
  battleSpeed: BattleSpeed;
  aiBattleLogLevel: AiBattleLogLevel;
  tacticHints?: boolean;
  uiDensity?: "standard" | "compact";
  autoSave?: boolean;
  animationsEnabled?: boolean;
  soundEnabled?: boolean;
  immersiveHints?: boolean;
  aiLevel?: DifficultyAiLevel;
  eventFrequency?: EventFrequency;
  battleComplexity?: BattleComplexity;
  liubeiProtectionMode?: "off" | "standard" | "extended";
  autoGovernanceMode?: AutoGovernanceMode;
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
