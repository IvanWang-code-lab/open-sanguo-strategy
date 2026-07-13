import type {
  FactionId,
  ScenarioCity,
  ScenarioData,
  ScenarioFaction,
} from "../types/scenario";
import type {
  PrototypeGameLogEntry,
  PrototypeStateSummary,
} from "./prototypeState";

export interface PrototypeCityViewModel {
  id: string;
  name: string;
  ownerFactionId: FactionId;
  ownerFactionName: string;
  positionLabel: string;
  populationLabel: string;
  resourceLabel: string;
  defenseLabel: string;
  isSelected: boolean;
}

export interface PrototypeFactionViewModel {
  id: FactionId;
  name: string;
  color: string;
  capitalCityName: string;
  cityCount: number;
  officerCount: number;
  isActive: boolean;
}

export interface PrototypeLogViewModel {
  label: string;
  turn: number;
  factionId: FactionId;
  message: string;
}

export interface PrototypeViewModel {
  title: string;
  currentTurnLabel: string;
  activeFactionLabel: string;
  selectedCityLabel: string;
  factions: PrototypeFactionViewModel[];
  cities: PrototypeCityViewModel[];
  logs: PrototypeLogViewModel[];
}

export function createPrototypeViewModel(
  scenario: ScenarioData,
  summary: PrototypeStateSummary
): PrototypeViewModel {
  return {
    title: scenario.name,
    currentTurnLabel: `Turn ${summary.currentTurn}`,
    activeFactionLabel: summary.activeFaction
      ? `Active faction: ${summary.activeFaction.name}`
      : "Active faction: Unknown",
    selectedCityLabel: summary.selectedCity
      ? `Selected city: ${summary.selectedCity.name}`
      : "Selected city: None",
    factions: createFactionViewModels(summary),
    cities: createCityViewModels(scenario, summary),
    logs: createLogViewModels(summary.log),
  };
}

function createFactionViewModels(
  summary: PrototypeStateSummary
): PrototypeFactionViewModel[] {
  return summary.factions.map((entry) => ({
    id: entry.faction.id,
    name: entry.faction.name,
    color: entry.faction.color,
    capitalCityName:
      entry.cities.find((city) => city.id === entry.faction.capitalCityId)?.name ??
      "Unknown capital",
    cityCount: entry.cities.length,
    officerCount: entry.officers.length,
    isActive: summary.activeFaction?.id === entry.faction.id,
  }));
}

function createCityViewModels(
  scenario: ScenarioData,
  summary: PrototypeStateSummary
): PrototypeCityViewModel[] {
  return scenario.cities.map((city) => {
    const ownerFaction = findFactionById(scenario, city.ownerFactionId);

    return {
      id: city.id,
      name: city.name,
      ownerFactionId: city.ownerFactionId,
      ownerFactionName: ownerFaction?.name ?? "Unknown faction",
      positionLabel: formatCityPosition(city),
      populationLabel: `Population: ${city.population.toLocaleString()}`,
      resourceLabel: `Food: ${city.food.toLocaleString()} / Gold: ${city.gold.toLocaleString()}`,
      defenseLabel: `Defense: ${city.defense}`,
      isSelected: summary.selectedCity?.id === city.id,
    };
  });
}

function createLogViewModels(
  logs: PrototypeGameLogEntry[]
): PrototypeLogViewModel[] {
  return logs.map((entry, index) => ({
    label: `#${index + 1} Turn ${entry.turn}`,
    turn: entry.turn,
    factionId: entry.factionId,
    message: entry.message,
  }));
}

function findFactionById(
  scenario: ScenarioData,
  factionId: FactionId
): ScenarioFaction | undefined {
  return scenario.factions.find((faction) => faction.id === factionId);
}

function formatCityPosition(city: ScenarioCity): string {
  return `Position: (${city.position.x}, ${city.position.y})`;
}
