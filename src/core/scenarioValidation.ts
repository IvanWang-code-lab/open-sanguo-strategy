import type {
  CityId,
  FactionId,
  OfficerId,
  ScenarioData,
} from "../types/scenario";

export type ScenarioValidationSeverity = "error" | "warning";

export interface ScenarioValidationIssue {
  severity: ScenarioValidationSeverity;
  code: string;
  message: string;
}

export interface ScenarioValidationResult {
  isValid: boolean;
  errors: ScenarioValidationIssue[];
  warnings: ScenarioValidationIssue[];
  issues: ScenarioValidationIssue[];
}

function createIssue(
  severity: ScenarioValidationSeverity,
  code: string,
  message: string
): ScenarioValidationIssue {
  return {
    severity,
    code,
    message,
  };
}

function hasDuplicateIds<T extends { id: string }>(items: T[]): boolean {
  const seen = new Set<string>();

  for (const item of items) {
    if (seen.has(item.id)) {
      return true;
    }

    seen.add(item.id);
  }

  return false;
}

function buildIdSet<T extends { id: string }>(items: T[]): Set<string> {
  return new Set(items.map((item) => item.id));
}

export function validateScenarioData(
  scenario: ScenarioData
): ScenarioValidationResult {
  const issues: ScenarioValidationIssue[] = [];

  const factionIds = buildIdSet(scenario.factions);
  const cityIds = buildIdSet(scenario.cities);
  const officerIds = buildIdSet(scenario.officers);

  validateScenarioBasics(scenario, issues);
  validateDuplicateIds(scenario, issues);
  validateFactionReferences(scenario, factionIds, cityIds, issues);
  validateCityReferences(scenario, factionIds, issues);
  validateOfficerReferences(scenario, factionIds, cityIds, officerIds, issues);

  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    issues,
  };
}

function validateScenarioBasics(
  scenario: ScenarioData,
  issues: ScenarioValidationIssue[]
): void {
  if (!scenario.id.trim()) {
    issues.push(
      createIssue("error", "SCENARIO_ID_EMPTY", "Scenario id cannot be empty.")
    );
  }

  if (!scenario.name.trim()) {
    issues.push(
      createIssue("warning", "SCENARIO_NAME_EMPTY", "Scenario name is empty.")
    );
  }

  if (scenario.initialTurn < 1) {
    issues.push(
      createIssue(
        "error",
        "INVALID_INITIAL_TURN",
        "Scenario initialTurn should be greater than or equal to 1."
      )
    );
  }

  if (scenario.map.width <= 0 || scenario.map.height <= 0) {
    issues.push(
      createIssue(
        "error",
        "INVALID_MAP_SIZE",
        "Scenario map width and height should be greater than 0."
      )
    );
  }

  if (scenario.factions.length === 0) {
    issues.push(
      createIssue(
        "error",
        "NO_FACTIONS",
        "Scenario must include at least one faction."
      )
    );
  }

  if (scenario.cities.length === 0) {
    issues.push(
      createIssue(
        "error",
        "NO_CITIES",
        "Scenario must include at least one city."
      )
    );
  }
}

function validateDuplicateIds(
  scenario: ScenarioData,
  issues: ScenarioValidationIssue[]
): void {
  if (hasDuplicateIds(scenario.factions)) {
    issues.push(
      createIssue(
        "error",
        "DUPLICATE_FACTION_IDS",
        "Scenario contains duplicate faction ids."
      )
    );
  }

  if (hasDuplicateIds(scenario.cities)) {
    issues.push(
      createIssue(
        "error",
        "DUPLICATE_CITY_IDS",
        "Scenario contains duplicate city ids."
      )
    );
  }

  if (hasDuplicateIds(scenario.officers)) {
    issues.push(
      createIssue(
        "error",
        "DUPLICATE_OFFICER_IDS",
        "Scenario contains duplicate officer ids."
      )
    );
  }
}

function validateFactionReferences(
  scenario: ScenarioData,
  factionIds: Set<FactionId>,
  cityIds: Set<CityId>,
  issues: ScenarioValidationIssue[]
): void {
  if (!factionIds.has(scenario.initialActiveFactionId)) {
    issues.push(
      createIssue(
        "error",
        "INVALID_INITIAL_ACTIVE_FACTION",
        `Initial active faction does not exist: ${scenario.initialActiveFactionId}.`
      )
    );
  }

  for (const faction of scenario.factions) {
    if (!cityIds.has(faction.capitalCityId)) {
      issues.push(
        createIssue(
          "error",
          "INVALID_FACTION_CAPITAL",
          `Faction ${faction.id} references missing capital city: ${faction.capitalCityId}.`
        )
      );
    }
  }
}

function validateCityReferences(
  scenario: ScenarioData,
  factionIds: Set<FactionId>,
  issues: ScenarioValidationIssue[]
): void {
  for (const city of scenario.cities) {
    if (!factionIds.has(city.ownerFactionId)) {
      issues.push(
        createIssue(
          "error",
          "INVALID_CITY_OWNER",
          `City ${city.id} references missing owner faction: ${city.ownerFactionId}.`
        )
      );
    }

    if (
      city.population < 0 ||
      city.food < 0 ||
      city.gold < 0 ||
      city.defense < 0
    ) {
      issues.push(
        createIssue(
          "warning",
          "NEGATIVE_CITY_VALUE",
          `City ${city.id} has a negative numeric value.`
        )
      );
    }

    if (city.position.x < 0 || city.position.y < 0) {
      issues.push(
        createIssue(
          "warning",
          "NEGATIVE_CITY_POSITION",
          `City ${city.id} has a negative map position.`
        )
      );
    }
  }
}

function validateOfficerReferences(
  scenario: ScenarioData,
  factionIds: Set<FactionId>,
  cityIds: Set<CityId>,
  officerIds: Set<OfficerId>,
  issues: ScenarioValidationIssue[]
): void {
  for (const officer of scenario.officers) {
    if (!officerIds.has(officer.id)) {
      issues.push(
        createIssue(
          "error",
          "INVALID_OFFICER_ID",
          `Officer has an invalid id: ${officer.id}.`
        )
      );
    }

    if (!factionIds.has(officer.factionId)) {
      issues.push(
        createIssue(
          "error",
          "INVALID_OFFICER_FACTION",
          `Officer ${officer.id} references missing faction: ${officer.factionId}.`
        )
      );
    }

    if (!cityIds.has(officer.cityId)) {
      issues.push(
        createIssue(
          "error",
          "INVALID_OFFICER_CITY",
          `Officer ${officer.id} references missing city: ${officer.cityId}.`
        )
      );
    }

    validateOfficerStat(officer.id, "leadership", officer.leadership, issues);
    validateOfficerStat(officer.id, "politics", officer.politics, issues);
    validateOfficerStat(officer.id, "war", officer.war, issues);
    validateOfficerStat(officer.id, "intelligence", officer.intelligence, issues);
  }
}

function validateOfficerStat(
  officerId: OfficerId,
  statName: string,
  value: number,
  issues: ScenarioValidationIssue[]
): void {
  if (value < 0 || value > 100) {
    issues.push(
      createIssue(
        "warning",
        "OFFICER_STAT_OUT_OF_RANGE",
        `Officer ${officerId} has ${statName} outside the recommended 0-100 range.`
      )
    );
  }
}
