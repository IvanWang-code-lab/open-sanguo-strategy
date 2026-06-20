export type ScenarioId = string;
export type FactionId = string;
export type CityId = string;
export type OfficerId = string;

export interface ScenarioMap {
type: "placeholder-grid" | string;
width: number;
height: number;
}

export interface ScenarioFaction {
id: FactionId;
name: string;
color: string;
capitalCityId: CityId;
strategy: string;
}

export interface ScenarioPosition {
x: number;
y: number;
}

export interface ScenarioCity {
id: CityId;
name: string;
ownerFactionId: FactionId;
position: ScenarioPosition;
population: number;
food: number;
gold: number;
defense: number;
}

export interface ScenarioOfficer {
id: OfficerId;
name: string;
factionId: FactionId;
cityId: CityId;
leadership: number;
politics: number;
war: number;
intelligence: number;
}

export interface ScenarioData {
id: ScenarioId;
name: string;
version: string;
description: string;
initialTurn: number;
initialActiveFactionId: FactionId;
map: ScenarioMap;
factions: ScenarioFaction[];
cities: ScenarioCity[];
officers: ScenarioOfficer[];
prototypeGoals: string[];
}

export interface GameTurnState {
currentTurn: number;
activeFactionId: FactionId;
}

export function getFactionById(
scenario: ScenarioData,
factionId: FactionId
): ScenarioFaction | undefined {
return scenario.factions.find((faction) => faction.id === factionId);
}

export function getCityById(
scenario: ScenarioData,
cityId: CityId
): ScenarioCity | undefined {
return scenario.cities.find((city) => city.id === cityId);
}

export function getOfficersByFactionId(
scenario: ScenarioData,
factionId: FactionId
): ScenarioOfficer[] {
return scenario.officers.filter((officer) => officer.factionId === factionId);
}

export function getCitiesByFactionId(
scenario: ScenarioData,
factionId: FactionId
): ScenarioCity[] {
return scenario.cities.filter((city) => city.ownerFactionId === factionId);
}
